import { gql, useQuery } from "@apollo/client";
import * as React from "react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import Col from "react-bootstrap/Col";
import ReactMapGL, { NavigationControl } from "react-map-gl";
import type { ViewState, MapRef } from "react-map-gl";
import {
  MapLayerMouseEvent,
  LngLatBounds,
  LngLat,
  PaddingOptions,
} from "mapbox-gl";
import Geocoder from "../lib/Geocoder";
import Sidebar from "./Sidebar";
import ClaimSource from "./sources/ClaimSource";
import GridSource, { Grid } from "./sources/GridSource";
import ParcelSource, { parcelsToMultiPoly } from "./sources/ParcelSource";

import { Contracts } from "@geo-web/sdk/dist/contract/types";
import { GeoWebContent } from "@geo-web/content";

import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Image from "react-bootstrap/Image";
import Alert from "react-bootstrap/Alert";

import { CeramicClient } from "@ceramicnetwork/http-client";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { ethers, BigNumber } from "ethers";
import "mapbox-gl/dist/mapbox-gl.css";

import { Framework, NativeAssetSuperToken } from "@superfluid-finance/sdk-core";
import firebase from "firebase/app";
import type { IPFS } from "ipfs-core-types";
import { Web3Storage } from "web3.storage";

import type { Point, MultiPolygon, Polygon } from "@turf/turf";
import * as turf from "@turf/turf";

export const ZOOM_GRID_LEVEL = 17;
const GRID_DIM_LAT = 140;
const GRID_DIM_LON = 80;
export const GW_CELL_SIZE_LAT = 23;
export const GW_CELL_SIZE_LON = 24;
export const GW_MAX_LAT = (1 << (GW_CELL_SIZE_LAT - 1)) - 1;
export const GW_MAX_LON = (1 << (GW_CELL_SIZE_LON - 1)) - 1;
const ZOOM_QUERY_LEVEL = 8;
const QUERY_DIM = 0.025;

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

export interface GeoWebCoordinate {
  from_gps: (lon: number, lat: number, maxLat: number) => bigint;
  to_gps: (gwCoord: bigint, maxLat: number, maxLon: number) => number[][];
  get_x: (gwCoord: bigint) => number;
  get_y: (gwCoord: bigint) => number;
  make_gw_coord: (x: number, y: number) => bigint;
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

export function coordToFeature(
  gwCoord: bigint,
  coords: number[][],
  gwCoordX: number,
  gwCoordY: number
): GeoJSON.Feature {
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
    properties: {
      gwCoord: gwCoord.toString(),
      gwCoordX: gwCoordX,
      gwCoordY: gwCoordY,
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
  web3Storage: Web3Storage;
  geoWebCoordinate: GeoWebCoordinate;
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
  [MapStyleName.satellite]: "mapbox://styles/mapbox/satellite-streets-v12",
  [MapStyleName.street]: "mapbox://styles/codynhat/ckrwf327s69zk17mrdkej5fln",
};

function Map(props: MapProps) {
  const {
    geoWebCoordinate,
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

  const mapPadding = {
    top: 120,
    bottom: 0,
    left: 0,
    right: 0,
  };

  const [viewport, setViewport] = useState<ViewState>({
    latitude: 40.780503,
    longitude: -73.96663,
    zoom: process.env.NEXT_PUBLIC_APP_ENV === "mainnet" ? 1 : 13,
    bearing: 0,
    pitch: 0,
    padding: mapPadding,
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
  const [interactiveLayerIds, setInteractiveLayerIds] = React.useState<
    string[]
  >([]);
  const [invalidLicenseId, setInvalidLicenseId] = useState("");
  const [newParcel, setNewParcel] = React.useState<{
    id: string;
    timerId: number | null;
  }>({ id: "", timerId: null });

  const router = useRouter();

  const isGridVisible =
    viewport.zoom >= ZOOM_GRID_LEVEL &&
    (interactionState === STATE.VIEWING ||
      interactionState === STATE.CLAIM_SELECTING);

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
      padding,
    }: {
      longitude: number;
      latitude: number;
      duration: number;
      zoom: number;
      padding: PaddingOptions;
    }) => {
      mapRef.current?.flyTo({
        center: [longitude, latitude],
        duration,
        zoom,
        padding: padding,
      });
    },
    []
  );

  function updateGrid(
    lat: number,
    lon: number,
    oldGrid: Grid | null,
    setGrid: React.Dispatch<React.SetStateAction<Grid | null>>
  ) {
    const gwCoord = geoWebCoordinate.from_gps(lon, lat, GW_MAX_LAT);
    const x = geoWebCoordinate.get_x(gwCoord);
    const y = geoWebCoordinate.get_y(gwCoord);

    if (
      oldGrid != null &&
      Math.abs(oldGrid.center.x - x) < GRID_DIM_LAT / 4 &&
      Math.abs(oldGrid.center.y - y) < GRID_DIM_LON / 4
    ) {
      return;
    }

    const features = [];
    for (let _x = x - GRID_DIM_LAT; _x < x + GRID_DIM_LAT; _x++) {
      for (let _y = y - GRID_DIM_LON; _y < y + GRID_DIM_LON; _y++) {
        const gwCoord = geoWebCoordinate.make_gw_coord(_x, _y);
        const coords = geoWebCoordinate.to_gps(gwCoord, GW_MAX_LAT, GW_MAX_LON);
        const gwCoordX = geoWebCoordinate.get_x(gwCoord);
        const gwCoordY = geoWebCoordinate.get_y(gwCoord);

        features.push(coordToFeature(gwCoord, coords, gwCoordX, gwCoordY));
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

  function coordToPolygon(gwCoord: bigint): Polygon {
    const coords = geoWebCoordinate.to_gps(gwCoord, GW_MAX_LAT, GW_MAX_LON);
    return turf.polygon([[...coords, coords[0]]]).geometry;
  }

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

    const { query } = router;

    if (query.longitude && query.latitude && query.id) {
      flyToLocation({
        longitude: Number(query.longitude),
        latitude: Number(query.latitude),
        zoom: ZOOM_GRID_LEVEL,
        duration: 500,
        padding: {
          ...mapPadding,
          left: document.body.offsetWidth * 0.25,
        },
      });

      setSelectedParcelId(
        typeof query.id === "string" ? query.id : query.id[0]
      );
      setInteractionState(STATE.PARCEL_SELECTED);
      setSelectedParcelCoords({
        x: Number(query.longitude),
        y: Number(query.latitude),
      });
    }
  }

  function _onMove(nextViewport: ViewState) {
    if (interactionState == STATE.EDITING_GALLERY || mapRef.current == null) {
      return;
    }
    setViewport(nextViewport);

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

  function _onMoveEnd(viewState: ViewState) {
    if (viewState.zoom >= ZOOM_GRID_LEVEL) {
      updateGrid(viewport.latitude, viewport.longitude, grid, setGrid);
      setInteractiveLayerIds(["parcels-layer", "grid-layer"]);
    } else if (interactionState === STATE.VIEWING) {
      setClaimBase1Coord(null);
    }
  }

  function _onMouseMove(event: MapLayerMouseEvent) {
    if (event.features == null || viewport.zoom < 5) {
      return;
    }

    function _checkParcelHover(gwCoord: bigint) {
      const parcelFeature = event.features?.find(
        (f) => f.layer.id === "parcels-layer"
      );

      if (parcelFeature) {
        setParcelHoverId(parcelFeature.properties?.parcelId);

        return true;
      } else {
        if (!turf.intersect(existingMultiPoly, coordToPolygon(gwCoord))) {
          setParcelHoverId("");
        }

        return false;
      }
    }

    const gridFeature = event.features.find((f) => f.layer.id === "grid-layer");
    const gwCoord = geoWebCoordinate.from_gps(
      event.lngLat.lng,
      event.lngLat.lat,
      GW_MAX_LAT
    );

    switch (interactionState) {
      case STATE.VIEWING:
        if (_checkParcelHover(gwCoord)) {
          setClaimBase1Coord(null);
        } else if (isGridVisible) {
          setClaimBase1Coord({
            x: geoWebCoordinate.get_x(gwCoord),
            y: geoWebCoordinate.get_y(gwCoord),
          });
        }
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
        _checkParcelHover(gwCoord);
        break;
      default:
        break;
    }
  }

  function _onMouseOut() {
    if (interactionState === STATE.VIEWING) {
      setClaimBase1Coord(null);
    }
  }

  function _onClick(event: MapLayerMouseEvent) {
    if (viewport.zoom < 5) {
      return;
    }

    const gridFeature = event.features?.find(
      (f) => f.layer.id === "grid-layer"
    );
    const parcelFeature = event.features?.find(
      (f) => f.layer.id === "parcels-layer"
    );

    function _checkParcelClick() {
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
        const gwCoord = geoWebCoordinate.from_gps(
          event.lngLat.lng,
          event.lngLat.lat,
          GW_MAX_LAT
        );

        if (turf.intersect(existingMultiPoly, coordToPolygon(gwCoord))) {
          return true;
        }
      }

      return false;
    }

    const sidebarPixelWidth = document.body.offsetWidth * 0.25;

    switch (interactionState) {
      case STATE.VIEWING:
        if (_checkParcelClick()) {
          if (parcelFeature?.geometry.type === "Polygon") {
            const parcelCoordSe = parcelFeature.geometry.coordinates[0][3];
            const parcelCoordSw = parcelFeature.geometry.coordinates[0][0];
            const parcelPointSe = mapRef.current?.project(
              new LngLat(parcelCoordSe[0], parcelCoordSe[1])
            );
            const parcelPointSw = mapRef.current?.project(
              new LngLat(parcelCoordSw[0], parcelCoordSw[1])
            );
            const parcelSizeX =
              parcelPointSe && parcelPointSw
                ? parcelPointSe.x - parcelPointSw.x
                : 0;
            const shouldOffsetSidebar =
              parcelPointSw && parcelPointSw.x < sidebarPixelWidth;

            mapRef.current?.panBy(
              [
                shouldOffsetSidebar
                  ? sidebarPixelWidth * -1 - parcelSizeX + event.point.x
                  : 0,
                0,
              ],
              {
                duration: 0,
              }
            );
          }

          return;
        }

        if (isGridVisible) {
          const gwCoord = geoWebCoordinate.from_gps(
            event.lngLat.lng,
            event.lngLat.lat,
            GW_MAX_LAT
          );
          const coord = {
            x: geoWebCoordinate.get_x(gwCoord),
            y: geoWebCoordinate.get_y(gwCoord),
          };
          const cellCoords = geoWebCoordinate.to_gps(
            gwCoord,
            GW_MAX_LAT,
            GW_MAX_LON
          );
          const cellPointSw = mapRef.current?.project(
            new LngLat(cellCoords[0][0], cellCoords[0][1])
          );
          const cellPointSe = mapRef.current?.project(
            new LngLat(cellCoords[1][0], cellCoords[1][1])
          );
          const cellSizeX =
            cellPointSe && cellPointSw ? cellPointSe.x - cellPointSw.x : 0;
          const shouldOffsetSidebar =
            cellPointSw && cellPointSw.x < sidebarPixelWidth;

          setTimeout(
            () =>
              mapRef.current?.panBy(
                [
                  shouldOffsetSidebar
                    ? sidebarPixelWidth * -1 - cellSizeX + event.point.x
                    : 0,
                  0,
                ],
                {
                  duration: shouldOffsetSidebar ? 400 : 0,
                }
              ),
            100
          );

          setClaimBase1Coord(coord);
          setClaimBase2Coord(coord);
          setInteractionState(STATE.CLAIM_SELECTING);
        } else {
          flyToLocation({
            longitude: event.lngLat.lng,
            latitude: event.lngLat.lat,
            zoom: ZOOM_GRID_LEVEL + 1,
            duration: 500,
            padding: mapPadding,
          });
        }
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
        if (isGridVisible) {
          setInteractiveLayerIds(["parcels-layer", "grid-layer"]);
        }
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
        longitude: portfolioParcelCenter.coordinates[0],
        latitude: portfolioParcelCenter.coordinates[1],
        zoom: ZOOM_GRID_LEVEL,
        duration: 500,
        padding: {
          ...mapPadding,
          left: document.body.offsetWidth * 0.25,
        },
      });

      setSelectedParcelCoords({
        x: portfolioParcelCenter.coordinates[0],
        y: portfolioParcelCenter.coordinates[1],
      });
    }
  }, [portfolioParcelCenter]);

  return (
    <>
      {interactionState === STATE.CLAIM_SELECTING &&
        viewport.zoom < ZOOM_GRID_LEVEL && (
          <Alert
            className="position-absolute top-50 start-50 text-center"
            variant="warning"
            style={{ zIndex: 1, width: "256px" }}
          >
            Zoom to Continue Your Claim
            <br />
            or
            <br />
            Hit Esc to Cancel
          </Alert>
        )}
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
          delay={interactionState === STATE.CLAIM_SELECTING}
        ></Sidebar>
      ) : null}
      <Col sm={interactionState != STATE.VIEWING ? "9" : "12"} className="px-0">
        <ReactMapGL
          style={{
            width: "100vw",
            height: "100vh",
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={mapRef as any}
          {...viewport}
          mapboxAccessToken={process.env.NEXT_PUBLIC_REACT_APP_MAPBOX_TOKEN}
          mapStyle={mapStyleUrlByName[mapStyleName]}
          interactiveLayerIds={interactiveLayerIds}
          projection="globe"
          fog={{}}
          dragRotate={false}
          touchZoomRotate={false}
          onLoad={_onLoad}
          onMove={(e) => _onMove(e.viewState)}
          onMoveEnd={(e) => _onMoveEnd(e.viewState)}
          onMouseMove={_onMouseMove}
          onMouseOut={_onMouseOut}
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
            geoWebCoordinate={geoWebCoordinate}
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
          <NavigationControl position="bottom-right" showCompass={false} />
        </ReactMapGL>
      </Col>
      <Button
        variant="dark"
        className="border border-secondary border-top-0 grid-switch"
        style={{
          position: "absolute",
          bottom: "90px",
          right: "2vw",
          width: "31px",
          height: "29px",
          borderRadius: "0 0 4px 4px",
        }}
        onClick={() =>
          flyToLocation({
            longitude: viewport.longitude,
            latitude: viewport.latitude,
            zoom: ZOOM_GRID_LEVEL + 1,
            duration: 500,
            padding: mapPadding,
          })
        }
      >
        <Image
          alt="grid switch"
          src="grid-light.svg"
          width={30}
          className="position-relative top-50 start-50 translate-middle"
        />
      </Button>
      <ButtonGroup
        style={{
          position: "absolute",
          bottom: "4%",
          right: "2%",
          width: "123px",
          borderRadius: 12,
        }}
      >
        <Button
          style={{
            backgroundColor: mapStyleName === "street" ? "#2fc1c1" : "#202333",
          }}
          variant="secondary"
          onClick={() => handleMapstyle(MapStyleName.street)}
        >
          <Image src={"street_ic.png"} width={30} />
        </Button>
        <Button
          style={{
            backgroundColor:
              mapStyleName === "satellite" ? "#2fc1c1" : "#202333",
          }}
          variant="secondary"
          onClick={() => handleMapstyle(MapStyleName.satellite)}
        >
          <Image src={"satellite_ic.png"} width={30} />
        </Button>
      </ButtonGroup>
    </>
  );
}

export default Map;
