import { gql, useQuery } from "@apollo/client";
import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Col from "react-bootstrap/Col";
import ReactMapGL, { NavigationControl } from "react-map-gl";
import type { ViewState, MapRef } from "react-map-gl";
import { MapLayerMouseEvent, LngLatBounds, LngLat } from "mapbox-gl";
import Geocoder from "../lib/Geocoder";
import Sidebar from "./Sidebar";
import ClaimSource from "./sources/ClaimSource";
import GridSource, { Grid } from "./sources/GridSource";
import ParcelSource, {
  coordToPolygon,
  parcelsToMultiPoly,
} from "./sources/ParcelSource";

import { Contracts } from "@geo-web/sdk/dist/contract/types";
import { GeoWebContent } from "@geo-web/content";

import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Image from "react-bootstrap/Image";

import { CeramicClient } from "@ceramicnetwork/http-client";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { ethers, BigNumber } from "ethers";
import "mapbox-gl/dist/mapbox-gl.css";

import { Framework, NativeAssetSuperToken } from "@superfluid-finance/sdk-core";
import firebase from "firebase/app";
import type { IPFS } from "ipfs-core-types";

import { GeoWebCoordinate } from "js-geo-web-coordinate";
import type { Point, MultiPolygon, Polygon } from "@turf/turf";
import * as turf from "@turf/turf";

export const ZOOM_GRID_LEVEL = 17;
const GRID_DIM = 100;
export const GW_MAX_LAT = 22;
export const GW_MAX_LON = 23;
const ZOOM_QUERY_LEVEL = 8;
const QUERY_DIM = 0.025;
export const LON_OFFSET = 0.00062;
export const LAT_OFFSET = 0.0001;

export enum STATE {
  VIEWING = 0,
  CLAIM_SELECTING = 1,
  CLAIM_SELECTED = 2,
  PARCEL_SELECTED = 3,
  PARCEL_EDITING = 4,
  PARCEL_PLACING_BID = 5,
  EDITING_GALLERY = 6,
  PARCEL_REJECTING_BID = 7,
  PARCEL_RECLAIMING = 8,
}

export type Coord = {
  x: number;
  y: number;
};

export interface PolygonQuery {
  geoWebParcels: GeoWebParcel[];
}

export interface GeoWebParcel {
  id: string;
  createdAtBlock: number;
  bboxN: number;
  bboxS: number;
  bboxE: number;
  bboxW: number;
  coordinates: number[];
}

const query = gql`
  query Polygons(
    $lastBlock: BigInt
    $north: BigDecimal
    $south: BigDecimal
    $east: BigDecimal
    $west: BigDecimal
  ) {
    geoWebParcels(
      orderBy: createdAtBlock
      first: 1000
      where: {
        createdAtBlock_gt: $lastBlock
        bboxN_gt: $south
        bboxS_lt: $north
        bboxE_gt: $west
        bboxW_lt: $east
      }
    ) {
      id
      createdAtBlock
      bboxN
      bboxS
      bboxE
      bboxW
      coordinates
    }
  }
`;

function updateGrid(
  lat: number,
  lon: number,
  oldGrid: Grid | null,
  setGrid: React.Dispatch<React.SetStateAction<Grid | null>>
) {
  const gwCoord = GeoWebCoordinate.fromGPS(lon, lat, GW_MAX_LON, GW_MAX_LAT);
  const x = gwCoord.getX().toNumber();
  const y = gwCoord.getY().toNumber();

  if (
    oldGrid != null &&
    Math.abs(oldGrid.center.x - x) < GRID_DIM / 2 &&
    Math.abs(oldGrid.center.y - y) < GRID_DIM / 2
  ) {
    return;
  }

  const features = [];
  for (let _x = x - GRID_DIM; _x < x + GRID_DIM; _x++) {
    for (let _y = y - GRID_DIM; _y < y + GRID_DIM; _y++) {
      features.push(
        coordToFeature(
          GeoWebCoordinate.fromXandY(_x, _y, GW_MAX_LON, GW_MAX_LAT)
        )
      );
    }
  }

  setGrid({
    center: {
      x: x,
      y: y,
    },
    features: features,
  });
}

export function coordToFeature(gwCoord: GeoWebCoordinate): GeoJSON.Feature {
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [gwCoord.toGPS()],
    },
    properties: {
      gwCoord: parseInt(gwCoord.toString()).toString(16),
      gwCoordX: gwCoord.getX().toNumber(),
      gwCoordY: gwCoord.getY().toNumber(),
    },
  };
}

function normalizeQueryVariables(mapBounds: LngLatBounds) {
  return {
    north: mapBounds.getNorth(),
    south: mapBounds.getSouth(),
    east: mapBounds.getEast(),
    west: mapBounds.getWest(),
  };
}

export type MapProps = {
  registryContract: Contracts["registryDiamondContract"];
  selectedParcelId: string;
  setSelectedParcelId: React.Dispatch<React.SetStateAction<string>>;
  interactionState: STATE;
  setInteractionState: React.Dispatch<React.SetStateAction<STATE>>;
  account: string;
  provider: ethers.providers.Web3Provider;
  disconnectWallet: () => void;
  ceramic: CeramicClient;
  ipfs: IPFS;
  geoWebContent: GeoWebContent;
  firebasePerf: firebase.performance.Performance;
  paymentToken: NativeAssetSuperToken;
  sfFramework: Framework;
  setPortfolioNeedActionCount: React.Dispatch<React.SetStateAction<number>>;
  portfolioParcelCenter: Point | null;
  setPortfolioParcelCenter: React.Dispatch<React.SetStateAction<Point | null>>;
  isPortfolioToUpdate: boolean;
  auctionStart: BigNumber;
  auctionEnd: BigNumber;
  startingBid: BigNumber;
  endingBid: BigNumber;
  isPreFairLaunch: boolean;
  setIsPortfolioToUpdate: React.Dispatch<React.SetStateAction<boolean>>;
};

const MAP_STYLE_KEY = "storedMapStyleName";

enum MapStyleName {
  satellite = "satellite",
  street = "street",
}

const mapStyleUrlByName: Record<MapStyleName, string> = {
  [MapStyleName.satellite]: "mapbox://styles/mapbox/satellite-streets-v11",
  [MapStyleName.street]: "mapbox://styles/codynhat/ckrwf327s69zk17mrdkej5fln",
};

function Map(props: MapProps) {
  const {
    selectedParcelId,
    setSelectedParcelId,
    interactionState,
    setInteractionState,
    portfolioParcelCenter,
  } = props;
  const { data, fetchMore, refetch } = useQuery<PolygonQuery>(query, {
    variables: {
      lastBlock: 0,
      north: 0,
      south: 0,
      east: 0,
      west: 0,
    },
  });

  const mapRef = useRef<MapRef>();

  const [mapStyleName, setMapStyleName] = React.useState(
    (localStorage.getItem(MAP_STYLE_KEY) as MapStyleName) ||
      MapStyleName.satellite
  );

  const handleMapstyle = (newStyle: MapStyleName) => {
    localStorage.setItem(MAP_STYLE_KEY, newStyle);
    setMapStyleName(newStyle);
  };

  const [viewport, setViewport] = useState<ViewState>({
    latitude: 40.780503,
    longitude: -73.96663,
    zoom: 1,
    bearing: 0,
    pitch: 0,
    padding: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
  });
  const [shouldUpdateOnNextZoom, setShouldUpdateOnNextZoom] = useState(true);
  const [oldCoord, setOldCoord] = useState<LngLat | null>(null);
  const [grid, setGrid] = useState<Grid | null>(null);
  const [parcelHoverId, setParcelHoverId] = useState("");

  const [claimBase1Coord, setClaimBase1Coord] = useState<Coord | null>(null);
  const [claimBase2Coord, setClaimBase2Coord] = useState<Coord | null>(null);

  const [selectedParcelCoords, setSelectedParcelCoords] =
    useState<Coord | null>(null);

  const [existingMultiPoly, setExistingMultiPoly] = useState<
    MultiPolygon | Polygon
  >(turf.multiPolygon([]).geometry);

  const [isValidClaim, setIsValidClaim] = React.useState(true);
  const [isParcelAvailable, setIsParcelAvailable] = React.useState(true);
  const [parcelClaimSize, setParcelClaimSize] = React.useState(0);
  const [interactiveLayerIds, setInteractiveLayerIds] =
    React.useState<string[]>([]);
  const [invalidLicenseId, setInvalidLicenseId] = useState("");
  const [newParcel, setNewParcel] = React.useState<{
    id: string;
    timerId: number | null;
  }>({ id: "", timerId: null });

  const isGridVisible =
    viewport.zoom >= ZOOM_GRID_LEVEL &&
    (interactionState == STATE.CLAIM_SELECTING ||
      interactionState == STATE.CLAIM_SELECTED);

  // Fetch more until none left
  useEffect(() => {
    if (newParcel.id) {
      const lastParcel = data?.geoWebParcels[data.geoWebParcels?.length - 1];

      if (lastParcel?.id === newParcel.id) {
        clearInterval(newParcel.timerId ?? undefined);
        setNewParcel({ id: "", timerId: null });
        return;
      }

      if (!newParcel.timerId) {
        setNewParcel({
          ...newParcel,
          timerId: Number(setInterval(_fetchMoreParcels, 2000)),
        });
      }
    }

    _fetchMoreParcels();

    return () => {
      if (newParcel.timerId) {
        clearInterval(newParcel.timerId);
      }
    };
  }, [data, newParcel.id, fetchMore]);

  const flyToLocation = useCallback(
    ({
      longitude,
      latitude,
      duration,
      zoom,
    }: {
      longitude: number;
      latitude: number;
      duration: number;
      zoom: number;
    }) => {
      mapRef.current?.flyTo({
        center: [longitude, latitude],
        duration,
        zoom,
      });
    },
    []
  );

  function _fetchMoreParcels() {
    if (data == null || viewport == null || mapRef.current == null) {
      return;
    }

    let newLastBlock;

    if (data.geoWebParcels.length > 0) {
      newLastBlock =
        data.geoWebParcels[data.geoWebParcels.length - 1].createdAtBlock;
    } else if (newParcel.id) {
      newLastBlock = 0;
    } else {
      return;
    }

    const mapBounds = mapRef.current.getBounds();
    const params = normalizeQueryVariables(mapBounds);

    fetchMore({
      variables: {
        lastBlock: newLastBlock,
        ...params,
      },
    });
  }

  function _onLoad() {
    if (mapRef.current == null) {
      return;
    }

    const mapBounds = mapRef.current.getBounds();
    const params = normalizeQueryVariables(mapBounds);

    const opts = {
      lastBlock: 0,
      ...params,
    };
    refetch(opts);

    setOldCoord(mapBounds.getCenter());
    setInteractiveLayerIds(["parcels-layer"]);
  }

  function _onMove(nextViewport: ViewState) {
    if (interactionState == STATE.EDITING_GALLERY || mapRef.current == null) {
      return;
    }
    setViewport(nextViewport);

    if (
      (interactionState == STATE.CLAIM_SELECTING ||
        interactionState == STATE.CLAIM_SELECTED) &&
      nextViewport.zoom >= ZOOM_GRID_LEVEL
    ) {
      updateGrid(viewport.latitude, viewport.longitude, grid, setGrid);
      setInteractiveLayerIds(["parcels-layer", "grid-layer"]);
    }

    const mapBounds = mapRef.current.getBounds();
    const params = normalizeQueryVariables(mapBounds);

    if (nextViewport.zoom >= ZOOM_QUERY_LEVEL && shouldUpdateOnNextZoom) {
      const opts = {
        lastBlock: 0,
        ...params,
      };
      refetch(opts);

      setShouldUpdateOnNextZoom(false);
    }

    if (nextViewport.zoom < ZOOM_QUERY_LEVEL) {
      setShouldUpdateOnNextZoom(true);
    }

    if (
      oldCoord &&
      nextViewport.zoom >= ZOOM_QUERY_LEVEL &&
      (Math.abs(mapBounds.getCenter().lng - oldCoord.lng) > QUERY_DIM ||
        Math.abs(mapBounds.getCenter().lat - oldCoord.lat) > QUERY_DIM)
    ) {
      const opts = {
        lastBlock: 0,
        ...params,
      };
      refetch(opts);

      setOldCoord(mapBounds.getCenter());
    }
  }

  function _onMouseMove(event: MapLayerMouseEvent) {
    if (event.features == null || viewport.zoom < 5) {
      return;
    }

    function _checkParcelHover() {
      const parcelFeature = event.features?.find(
        (f) => f.layer.id === "parcels-layer"
      );
      if (parcelFeature) {
        setParcelHoverId(parcelFeature.properties?.parcelId);
      } else {
        const gwCoord = GeoWebCoordinate.fromGPS(
          event.lngLat.lng,
          event.lngLat.lat,
          GW_MAX_LON,
          GW_MAX_LAT
        );

        if (!turf.intersect(existingMultiPoly, coordToPolygon(gwCoord))) {
          setParcelHoverId("");
        }
      }
    }

    const gridFeature = event.features.find((f) => f.layer.id === "grid-layer");

    switch (interactionState) {
      case STATE.VIEWING:
        _checkParcelHover();
        break;
      case STATE.CLAIM_SELECTING:
        if (gridFeature) {
          setClaimBase2Coord({
            x: gridFeature.properties?.gwCoordX,
            y: gridFeature.properties?.gwCoordY,
          });
        }
        break;
      case STATE.PARCEL_SELECTED:
        _checkParcelHover();
        break;
      default:
        break;
    }
  }

  function _onClick(event: MapLayerMouseEvent) {
    if (viewport.zoom < 5) {
      return;
    }

    const gridFeature = event.features?.find(
      (f) => f.layer.id === "grid-layer"
    );

    function _checkParcelClick() {
      const parcelFeature = event.features?.find(
        (f) => f.layer.id === "parcels-layer"
      );
      setSelectedParcelCoords({
        x: event.lngLat.lng,
        y: event.lngLat.lat,
      });
      if (parcelFeature) {
        setSelectedParcelId(parcelFeature.properties?.parcelId);
        setInteractionState(STATE.PARCEL_SELECTED);
        return true;
      } else if (parcelHoverId) {
        setSelectedParcelId(parcelHoverId);
        setInteractionState(STATE.PARCEL_SELECTED);
        return true;
      } else {
        const gwCoord = GeoWebCoordinate.fromGPS(
          event.lngLat.lng,
          event.lngLat.lat,
          GW_MAX_LON,
          GW_MAX_LAT
        );

        if (turf.intersect(existingMultiPoly, coordToPolygon(gwCoord))) {
          return true;
        }
      }

      return false;
    }

    const gwCoord = GeoWebCoordinate.fromGPS(
      event.lngLat.lng,
      event.lngLat.lat,
      GW_MAX_LON,
      GW_MAX_LAT
    );
    const coord = {
      x: gwCoord.getX().toNumber(),
      y: gwCoord.getY().toNumber(),
    };

    switch (interactionState) {
      case STATE.VIEWING:
        if (_checkParcelClick()) {
          setViewport({
            ...viewport,
            longitude: event.lngLat.lng + LON_OFFSET,
            latitude: event.lngLat.lat + LAT_OFFSET,
          });
          return;
        }

        setClaimBase1Coord(coord);
        setClaimBase2Coord(coord);
        setInteractionState(STATE.CLAIM_SELECTING);

        flyToLocation({
          longitude: event.lngLat.lng + LON_OFFSET,
          latitude: event.lngLat.lat + LAT_OFFSET,
          zoom: ZOOM_GRID_LEVEL + 1,
          duration: 500,
        });
        break;
      case STATE.CLAIM_SELECTING:
        if (!isValidClaim) {
          break;
        }
        if (gridFeature) {
          setClaimBase2Coord({
            x: gridFeature.properties?.gwCoordX,
            y: gridFeature.properties?.gwCoordY,
          });
        }
        setInteractionState(STATE.CLAIM_SELECTED);
        break;
      case STATE.CLAIM_SELECTED:
        setInteractionState(STATE.VIEWING);
        break;
      case STATE.PARCEL_SELECTED:
        if (_checkParcelClick()) {
          return;
        }
        setInteractionState(STATE.VIEWING);
        break;
      default:
        break;
    }
  }

  useEffect(() => {
    switch (interactionState) {
      case STATE.VIEWING:
        setClaimBase1Coord(null);
        setClaimBase2Coord(null);
        setSelectedParcelId("");
        setParcelHoverId("");
        break;
      case STATE.PARCEL_SELECTED:
        setClaimBase1Coord(null);
        setClaimBase2Coord(null);
        setParcelHoverId(selectedParcelId);
        break;
      case STATE.CLAIM_SELECTING:
        break;
      default:
        break;
    }
  }, [interactionState]);

  useEffect(() => {
    if (data != null) {
      const _existingMultiPoly = parcelsToMultiPoly(data);
      setExistingMultiPoly(_existingMultiPoly);
    }

    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInteractionState(STATE.VIEWING);
        setInteractiveLayerIds(["parcels-layer"]);
      }
    };
    window.addEventListener("keydown", listener);

    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, [data]);

  useEffect(() => {
    if (portfolioParcelCenter) {
      flyToLocation({
        longitude: portfolioParcelCenter.coordinates[0] + LON_OFFSET,
        latitude: portfolioParcelCenter.coordinates[1] + LAT_OFFSET,
        zoom: ZOOM_GRID_LEVEL + 1,
        duration: 500,
      });

      setSelectedParcelCoords({
        x: portfolioParcelCenter.coordinates[0],
        y: portfolioParcelCenter.coordinates[1],
      });
    }
  }, [portfolioParcelCenter]);

  return (
    <>
      {interactionState != STATE.VIEWING ? (
        <Sidebar
          {...props}
          interactionState={interactionState}
          setInteractionState={setInteractionState}
          claimBase1Coord={claimBase1Coord}
          claimBase2Coord={claimBase2Coord}
          selectedParcelId={selectedParcelId}
          setSelectedParcelId={setSelectedParcelId}
          setIsParcelAvailable={setIsParcelAvailable}
          parcelClaimSize={parcelClaimSize}
          invalidLicenseId={invalidLicenseId}
          setInvalidLicenseId={setInvalidLicenseId}
          setNewParcel={setNewParcel}
          selectedParcelCoords={selectedParcelCoords}
        ></Sidebar>
      ) : null}
      <Col sm={interactionState != STATE.VIEWING ? "9" : "12"} className="px-0">
        <ReactMapGL
          style={{
            width: interactionState != STATE.VIEWING ? "75vw" : "100vw",
            height: interactionState != STATE.VIEWING ? "100vh" : "100vh",
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={mapRef as any}
          {...viewport}
          mapboxAccessToken={process.env.NEXT_PUBLIC_REACT_APP_MAPBOX_TOKEN}
          mapStyle={mapStyleUrlByName[mapStyleName]}
          interactiveLayerIds={interactiveLayerIds}
          projection="globe"
          fog={{}}
          onLoad={_onLoad}
          onMove={(e) => _onMove(e.viewState)}
          onMouseMove={_onMouseMove}
          onClick={_onClick}
        >
          <GridSource grid={grid} isGridVisible={isGridVisible}></GridSource>
          <ParcelSource
            data={data ?? null}
            isAvailable={isParcelAvailable}
            parcelHoverId={parcelHoverId}
            selectedParcelId={selectedParcelId}
            invalidLicenseId={invalidLicenseId}
          ></ParcelSource>
          <ClaimSource
            existingMultiPoly={existingMultiPoly}
            claimBase1Coord={claimBase1Coord}
            claimBase2Coord={claimBase2Coord}
            isValidClaim={isValidClaim}
            setIsValidClaim={setIsValidClaim}
            parcelClaimSize={parcelClaimSize}
            setParcelClaimSize={setParcelClaimSize}
          ></ClaimSource>
          <Geocoder
            mapboxAccessToken={
              process.env.NEXT_PUBLIC_REACT_APP_MAPBOX_TOKEN ?? ""
            }
            position="top-right"
          />
          <NavigationControl position="bottom-right" />
        </ReactMapGL>
      </Col>
      <ButtonGroup
        style={{
          position: "absolute",
          bottom: "4%",
          right: "2%",
          width: "123px",
          borderRadius: 12,
        }}
        aria-label="Basic example"
      >
        <Button
          style={{
            backgroundColor: mapStyleName === "street" ? "#2fc1c1" : "#202333",
          }}
          variant="secondary"
          onClick={() => handleMapstyle(MapStyleName.street)}
        >
          <Image src={"street_ic.png"} style={{ height: 30, width: 30 }} />
        </Button>
        <Button
          style={{
            backgroundColor:
              mapStyleName === "satellite" ? "#2fc1c1" : "#202333",
          }}
          variant="secondary"
          onClick={() => handleMapstyle(MapStyleName.satellite)}
        >
          <Image src={"satellite_ic.png"} style={{ height: 30, width: 30 }} />
        </Button>
      </ButtonGroup>
    </>
  );
}

export default Map;
