import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
// eslint-disable-next-line import/named
import ReactMapGL, { MapEvent } from "react-map-gl";
import Geocoder from "react-map-gl-geocoder";
import GridSource from "./sources/GridSource";
import ParcelSource from "./sources/ParcelSource";
import ClaimSource from "./sources/ClaimSource";
import { gql, useQuery } from "@apollo/client";
import Sidebar from "./Sidebar";
import Col from "react-bootstrap/Col";

import { Contracts } from "@geo-web/sdk/dist/contract/types";

import ButtonGroup from "react-bootstrap/ButtonGroup";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";

import "mapbox-gl/dist/mapbox-gl.css";
import "react-map-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { CeramicClient } from "@ceramicnetwork/http-client";
import { ethers } from "ethers";

import firebase from "firebase/app";
import { IPFS } from "ipfs-core";
import { Framework, NativeAssetSuperToken } from "@superfluid-finance/sdk-core";

import { GeoWebCoordinate } from "js-geo-web-coordinate";

export const ZOOM_GRID_LEVEL = 17;
const GRID_DIM = 50;
export const GW_MAX_LAT = 21;
export const GW_MAX_LON = 22;
const ZOOM_QUERY_LEVEL = 8;
const QUERY_DIM = 1000;

export enum STATE {
  VIEWING = 0,
  CLAIM_SELECTING = 1,
  CLAIM_SELECTED = 2,
  PARCEL_SELECTED = 3,
  PARCEL_EDITING = 4,
  PARCEL_PLACING_BID = 5,
  EDITING_GALLERY = 6,
  PARCEL_REJECTING_BID = 7,
}

export type Coord = {
  x: number;
  y: number;
};

export interface PolygonQuery {
  geoWebCoordinates: GWCoordinateGQL[];
}

interface GeoPoint {
  id: string;
  lon: number;
  lat: number;
}

interface LandParcel {
  id: string;
}

interface GWCoordinateGQL {
  id: string;
  createdAtBlock: bigint;
  landParcel: LandParcel;
  pointBL: GeoPoint;
  pointBR: GeoPoint;
  pointTR: GeoPoint;
  pointTL: GeoPoint;
}

const query = gql`
  query Polygons(
    $lastBlock: BigInt
    $minX: BigInt
    $maxX: BigInt
    $minY: BigInt
    $maxY: BigInt
  ) {
    geoWebCoordinates(
      orderBy: createdAtBlock
      first: 1000
      where: {
        createdAtBlock_gt: $lastBlock
        coordX_gte: $minX
        coordX_lt: $maxX
        coordY_gte: $minY
        coordY_lt: $maxY
      }
    ) {
      id
      createdAtBlock
      landParcel {
        id
      }
      pointBR {
        lon
        lat
      }
      pointBL {
        lon
        lat
      }
      pointTR {
        lon
        lat
      }
      pointTL {
        lon
        lat
      }
    }
  }
`;

function updateGrid(lat: number, lon: number, oldGrid: any, setGrid: any) {
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

export type MapProps = {
  auctionSuperApp: Contracts["geoWebAuctionSuperAppContract"];
  licenseContract: Contracts["geoWebERC721LicenseContract"];
  claimerContract: Contracts["geoWebFairLaunchClaimerContract"];
  account: string;
  provider: ethers.providers.Web3Provider;
  ceramic: CeramicClient;
  ipfs: IPFS;
  firebasePerf: firebase.performance.Performance;
  paymentToken: NativeAssetSuperToken;
  sfFramework: Framework;
};

function Map(props: MapProps) {
  const { data, fetchMore, refetch } = useQuery<PolygonQuery>(query, {
    variables: {
      lastBlock: 0,
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
    },
  });

  const geocoderContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef();

  const [mapstyle, setMapstyle] = React.useState(
    "mapbox://styles/codynhat/ckrwf327s69zk17mrdkej5fln"
  );
  const [mapStyleName, setMapStyleName] = React.useState("street");

  const handleMapstyle = (newStyle: string) => {
    if (newStyle === "satellite")
      setMapstyle("mapbox://styles/mapbox/satellite-streets-v11");
    else setMapstyle("mapbox://styles/codynhat/ckrwf327s69zk17mrdkej5fln");

    setMapStyleName(newStyle);
  };

  // Fetch more until none left
  useEffect(() => {
    if (
      data == null ||
      data.geoWebCoordinates.length == 0 ||
      viewport == null
    ) {
      return;
    }
    const newLastBlock =
      data.geoWebCoordinates[data.geoWebCoordinates.length - 1].createdAtBlock;

    const gwCoord = GeoWebCoordinate.fromGPS(
      viewport.longitude,
      viewport.latitude,
      GW_MAX_LON,
      GW_MAX_LAT
    );
    const x = gwCoord.getX().toNumber();
    const y = gwCoord.getY().toNumber();

    fetchMore({
      variables: {
        lastBlock: newLastBlock,
        minX: x - QUERY_DIM,
        maxX: x + QUERY_DIM,
        minY: y - QUERY_DIM,
        maxY: y + QUERY_DIM,
      },
    });
  }, [data, fetchMore]);

  const [viewport, setViewport] = useState<Record<string, any> | null>(null);
  const [shouldUpdateOnNextZoom, setShouldUpdateOnNextZoom] = useState(true);
  const [oldCoordX, setOldCoordX] = useState(0);
  const [oldCoordY, setOldCoordY] = useState(0);
  const [grid, setGrid] = useState(null);
  const [interactionState, setInteractionState] = useState<STATE>(
    STATE.VIEWING
  );
  const [parcelHoverId, setParcelHoverId] = useState("");

  const [claimBase1Coord, setClaimBase1Coord] = useState<Coord | null>(null);
  const [claimBase2Coord, setClaimBase2Coord] = useState<Coord | null>(null);

  const [selectedParcelId, setSelectedParcelId] = useState("");

  const [existingCoords, setExistingCoords] = useState<Set<string>>(new Set());

  const [isValidClaim, setIsValidClaim] = React.useState(true);
  const [isParcelAvailable, setIsParcelAvailable] = React.useState(true);

  const isGridVisible =
    viewport?.zoom >= ZOOM_GRID_LEVEL &&
    (interactionState == STATE.CLAIM_SELECTING ||
      interactionState == STATE.CLAIM_SELECTED);

  const _onViewportSearch = useCallback((nextViewport: any) => {
    setViewport(nextViewport);
  }, []);

  function _onViewportChange(nextViewport: any) {
    if (interactionState == STATE.EDITING_GALLERY) {
      return;
    }
    setViewport(nextViewport);

    if (
      (interactionState == STATE.CLAIM_SELECTING ||
        interactionState == STATE.CLAIM_SELECTED) &&
      nextViewport.zoom >= ZOOM_GRID_LEVEL
    ) {
      updateGrid(viewport?.latitude, viewport?.longitude, grid, setGrid);
    }

    const gwCoord = GeoWebCoordinate.fromGPS(
      nextViewport.longitude,
      nextViewport.latitude,
      GW_MAX_LON,
      GW_MAX_LAT
    );
    const x = gwCoord.getX().toNumber();
    const y = gwCoord.getY().toNumber();

    if (nextViewport.zoom >= ZOOM_QUERY_LEVEL && shouldUpdateOnNextZoom) {
      refetch({
        lastBlock: 0,
        minX: x - QUERY_DIM,
        maxX: x + QUERY_DIM,
        minY: y - QUERY_DIM,
        maxY: y + QUERY_DIM,
      });

      setShouldUpdateOnNextZoom(false);
    }

    if (nextViewport.zoom < ZOOM_QUERY_LEVEL) {
      setShouldUpdateOnNextZoom(true);
    }

    if (
      nextViewport.zoom >= ZOOM_QUERY_LEVEL &&
      (Math.abs(x - oldCoordX) > QUERY_DIM ||
        Math.abs(y - oldCoordY) > QUERY_DIM)
    ) {
      refetch({
        lastBlock: 0,
        minX: x - QUERY_DIM,
        maxX: x + QUERY_DIM,
        minY: y - QUERY_DIM,
        maxY: y + QUERY_DIM,
      });

      setOldCoordX(x);
      setOldCoordY(y);
    }
  }

  // if using Geocoder default settings, you can just use handleViewportChange directly
  const _onGeocoderViewportChange = useCallback(
    (newViewport: any) => {
      const geocoderDefaultOverrides = { transitionDuration: 1000 };

      return _onViewportSearch({
        ...newViewport,
        ...geocoderDefaultOverrides,
      });
    },
    [_onViewportSearch]
  );

  function onHover(event: MapEvent) {
    if (event.features == null || viewport?.zoom < 5) {
      return;
    }

    function _checkParcelHover() {
      const parcelFeature = event.features?.find(
        (f) => f.layer.id === "parcels-layer"
      );
      if (parcelFeature) {
        setParcelHoverId(parcelFeature.properties.parcelId);
      } else {
        const gwCoord = GeoWebCoordinate.fromGPS(
          event.lngLat[0],
          event.lngLat[1],
          GW_MAX_LON,
          GW_MAX_LAT
        );

        if (!existingCoords.has(gwCoord.toString())) {
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
            x: gridFeature.properties.gwCoordX,
            y: gridFeature.properties.gwCoordY,
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

  function onClick(event: MapEvent) {
    if (viewport?.zoom < 5) {
      return;
    }

    const gridFeature = event.features?.find(
      (f) => f.layer.id === "grid-layer"
    );

    function _checkParcelClick() {
      const parcelFeature = event.features?.find(
        (f) => f.layer.id === "parcels-layer"
      );
      if (parcelFeature) {
        setSelectedParcelId(parcelFeature.properties.parcelId);
        setInteractionState(STATE.PARCEL_SELECTED);
        return true;
      } else if (parcelHoverId) {
        setSelectedParcelId(parcelHoverId);
        setInteractionState(STATE.PARCEL_SELECTED);
        return true;
      } else {
        const gwCoord = GeoWebCoordinate.fromGPS(
          event.lngLat[0],
          event.lngLat[1],
          GW_MAX_LON,
          GW_MAX_LAT
        );

        console.log("Coordinates:");
        console.log(
          GeoWebCoordinate.fromGPS(event.lngLat[0], event.lngLat[1], 19, 18)
        );

        console.log(
          GeoWebCoordinate.fromGPS(event.lngLat[0], event.lngLat[1], 20, 19)
        );

        if (existingCoords.has(gwCoord.toString())) {
          return true;
        }
      }

      return false;
    }

    const gwCoord = GeoWebCoordinate.fromGPS(
      event.lngLat[0],
      event.lngLat[1],
      GW_MAX_LON,
      GW_MAX_LAT
    );
    const coord = {
      x: gwCoord.getX().toNumber(),
      y: gwCoord.getY().toNumber(),
    };

    const nextViewport = {
      latitude: event.lngLat[1],
      longitude: event.lngLat[0],
      zoom: ZOOM_GRID_LEVEL + 1,
      transitionDuration: 500,
    };

    switch (interactionState) {
      case STATE.VIEWING:
        if (_checkParcelClick()) {
          return;
        }

        setClaimBase1Coord(coord);
        setClaimBase2Coord(coord);
        setInteractionState(STATE.CLAIM_SELECTING);

        setViewport(nextViewport);
        _onViewportChange(nextViewport);
        break;
      case STATE.CLAIM_SELECTING:
        if (!isValidClaim) {
          break;
        }
        if (gridFeature) {
          setClaimBase2Coord({
            x: gridFeature.properties.gwCoordX,
            y: gridFeature.properties.gwCoordY,
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
    if (data && data.geoWebCoordinates.length > 0 && viewport != null) {
      // Fetch more coordinates
      const gwCoord = GeoWebCoordinate.fromGPS(
        viewport.longitude,
        viewport.latitude,
        GW_MAX_LON,
        GW_MAX_LAT
      );
      const x = gwCoord.getX().toNumber();
      const y = gwCoord.getY().toNumber();

      refetch({
        lastBlock: 0,
        minX: x - QUERY_DIM,
        maxX: x + QUERY_DIM,
        minY: y - QUERY_DIM,
        maxY: y + QUERY_DIM,
      });
    }

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
      default:
        break;
    }
  }, [interactionState]);

  useEffect(() => {
    if (data != null) {
      const _existingCoords = new Set<string>(
        data.geoWebCoordinates.flatMap((p: any) => p.id)
      );
      setExistingCoords(_existingCoords);
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
        ></Sidebar>
      ) : null}
      <Col sm={interactionState != STATE.VIEWING ? "9" : "12"} className="px-0">
        <div
          id="geocoder"
          ref={geocoderContainerRef}
          style={{
            position: "absolute",
            top: "14vh",
            right: "0vw",
            zIndex: 1,
          }}
        />
        <ReactMapGL
          ref={mapRef}
          {...viewport}
          width={interactionState != STATE.VIEWING ? "75vw" : "100vw"}
          height={interactionState != STATE.VIEWING ? "100vh" : "100vh"}
          mapboxApiAccessToken={process.env.NEXT_PUBLIC_REACT_APP_MAPBOX_TOKEN}
          mapStyle={mapstyle}
          mapOptions={{
            renderWorldCopies: false,
          }}
          onViewportChange={_onViewportChange}
          onHover={onHover}
          onClick={onClick}
        >
          <GridSource grid={grid} isGridVisible={isGridVisible}></GridSource>
          <ParcelSource
            data={data ?? null}
            isAvailable={isParcelAvailable}
            parcelHoverId={parcelHoverId}
            selectedParcelId={selectedParcelId}
          ></ParcelSource>
          <ClaimSource
            existingCoords={existingCoords}
            claimBase1Coord={claimBase1Coord}
            claimBase2Coord={claimBase2Coord}
            isValidClaim={isValidClaim}
            setIsValidClaim={setIsValidClaim}
          ></ClaimSource>
          <Geocoder
            mapRef={mapRef}
            containerRef={geocoderContainerRef}
            onViewportChange={_onGeocoderViewportChange}
            mapboxApiAccessToken={
              process.env.NEXT_PUBLIC_REACT_APP_MAPBOX_TOKEN
            }
            position="top-right"
          />
        </ReactMapGL>
      </Col>
      <ButtonGroup
        style={{
          position: "absolute",
          bottom: "4%",
          right: "2%",
          borderRadius: 12,
        }}
        aria-label="Basic example"
      >
        <Button
          style={{
            backgroundColor: mapStyleName === "street" ? "#2fc1c1" : "#202333",
          }}
          variant="secondary"
          onClick={() => handleMapstyle("street")}
        >
          <Image src={"street_ic.png"} style={{ height: 30, width: 30 }} />
        </Button>
        <Button
          style={{
            backgroundColor:
              mapStyleName === "satellite" ? "#2fc1c1" : "#202333",
          }}
          variant="secondary"
          onClick={() => handleMapstyle("satellite")}
        >
          <Image src={"satellite_ic.png"} style={{ height: 30, width: 30 }} />
        </Button>
      </ButtonGroup>
    </>
  );
}

export default Map;
