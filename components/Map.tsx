import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import ReactMapGL, { MapEvent } from "react-map-gl";
import Geocoder from "react-map-gl-geocoder";
import GridSource from "./sources/GridSource";
import ParcelSource from "./sources/ParcelSource";
import GridHoverSource from "./sources/GridHoverSource";
import ClaimSource from "./sources/ClaimSource";
import { gql, useQuery } from "@apollo/client";
import Sidebar from "./Sidebar";
import Col from "react-bootstrap/Col";

import { Contracts } from "@geo-web/sdk/dist/contract/types";

import ButtonGroup from "react-bootstrap/ButtonGroup";
import Button from "react-bootstrap/Button";

import "mapbox-gl/dist/mapbox-gl.css";
import "react-map-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { CeramicClient } from "@ceramicnetwork/http-client";

const GeoWebCoordinate = require("js-geo-web-coordinate");

export const ZOOM_GRID_LEVEL = 14;
const GRID_DIM = 50;

export const STATE_VIEWING = 0;
export const STATE_CLAIM_SELECTING = 1;
export const STATE_CLAIM_SELECTED = 2;
export const STATE_PARCEL_SELECTED = 3;
export const STATE_PARCEL_EDITING = 4;
export const STATE_PARCEL_PURCHASING = 5;
export const STATE_EDITING_GALLERY = 6;

const query = gql`
  query Polygons($lastBlock: BigInt) {
    geoWebCoordinates(
      orderBy: createdAtBlock
      first: 1000
      where: { createdAtBlock_gt: $lastBlock }
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

function updateGrid(lat: any, lon: any, oldGrid: any, setGrid: any) {
  let gwCoord = GeoWebCoordinate.from_gps(lon, lat);
  let x = GeoWebCoordinate.get_x(gwCoord).toNumber();
  let y = GeoWebCoordinate.get_y(gwCoord).toNumber();

  if (
    oldGrid != null &&
    Math.abs(oldGrid.center.x - x) < GRID_DIM / 2 &&
    Math.abs(oldGrid.center.y - y) < GRID_DIM / 2
  ) {
    return;
  }

  let features = [];
  for (let _x = x - GRID_DIM; _x < x + GRID_DIM; _x++) {
    for (let _y = y - GRID_DIM; _y < y + GRID_DIM; _y++) {
      features.push(coordToFeature(GeoWebCoordinate.make_gw_coord(_x, _y)));
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

export function coordToFeature(gwCoord: any) {
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [GeoWebCoordinate.to_gps(gwCoord)],
    },
    properties: {
      gwCoord: gwCoord.toString(16),
      gwCoordX: GeoWebCoordinate.get_x(gwCoord).toNumber(),
      gwCoordY: GeoWebCoordinate.get_y(gwCoord).toNumber(),
    },
  };
}

type Props = {
  auctionSuperApp: Contracts["geoWebAuctionSuperAppContract"];
  licenseContract: Contracts["geoWebERC721LicenseContract"];
  account: string;
  ceramic: CeramicClient;
  ipfs: any;
  firebasePerf: any;
};

function Map({
  auctionSuperApp,
  licenseContract,
  account,
  ceramic,
  ipfs,
  firebasePerf,
}: Props) {
  const { loading, data, fetchMore } = useQuery(query, {
    variables: {
      lastBlock: 0,
    },
  });

  const geocoderContainerRef = useRef();
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
    if (data == null || data.geoWebCoordinates.length == 0) {
      return;
    }
    let newLastBlock =
      data.geoWebCoordinates[data.geoWebCoordinates.length - 1].createdAtBlock;

    fetchMore({
      variables: {
        lastBlock: newLastBlock,
      },
    });
  }, [data]);

  const [viewport, setViewport] = useState<any>({});
  const [grid, setGrid] = useState(null);
  const [interactionState, setInteractionState] = useState(STATE_VIEWING);
  const [gridHoverCoord, setGridHoverCoord] = useState("");
  const [parcelHoverId, setParcelHoverId] = useState("");

  const [claimBase1Coord, setClaimBase1Coord] = useState<any | null>(null);
  const [claimBase2Coord, setClaimBase2Coord] = useState<any | null>(null);

  const [selectedParcelId, setSelectedParcelId] = useState("");

  const [existingCoords, setExistingCoords] = useState(new Set());

  const [isValidClaim, setIsValidClaim] = React.useState(true);

  let isGridVisible =
    viewport.zoom >= ZOOM_GRID_LEVEL &&
    (interactionState == STATE_CLAIM_SELECTING ||
      interactionState == STATE_CLAIM_SELECTED);

  const _onViewportSearch = useCallback((nextViewport: any) => {
    setViewport(nextViewport);
  }, []);

  function _onViewportChange(nextViewport: any) {
    if (interactionState == STATE_EDITING_GALLERY) {
      return;
    }
    setViewport(nextViewport);

    if (
      (interactionState == STATE_CLAIM_SELECTING ||
        interactionState == STATE_CLAIM_SELECTED) &&
      nextViewport.zoom >= ZOOM_GRID_LEVEL
    ) {
      updateGrid(viewport.latitude, viewport.longitude, grid, setGrid);
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
    if (event.features == null || viewport.zoom < 5) {
      return;
    }

    function _checkParcelHover() {
      let parcelFeature = event.features?.find(
        (f) => f.layer.id === "parcels-layer"
      );
      if (parcelFeature) {
        setParcelHoverId(parcelFeature.properties.parcelId);
      } else {
        let gwCoord = GeoWebCoordinate.from_gps(
          event.lngLat[0],
          event.lngLat[1]
        );

        if (!existingCoords.has(gwCoord.toString(10))) {
          setParcelHoverId("");
        }
      }
    }

    switch (interactionState) {
      case STATE_VIEWING:
        _checkParcelHover();
        break;
      case STATE_CLAIM_SELECTING:
        let gridFeature = event.features.find(
          (f) => f.layer.id === "grid-layer"
        );
        if (gridFeature) {
          setClaimBase2Coord({
            x: gridFeature.properties.gwCoordX,
            y: gridFeature.properties.gwCoordY,
          });
        }
        break;
      case STATE_PARCEL_SELECTED:
        _checkParcelHover();
        break;
      default:
        break;
    }
  }

  function onClick(event: MapEvent) {
    if (viewport.zoom < 5) {
      return;
    }

    let gridFeature = event.features?.find((f) => f.layer.id === "grid-layer");

    function _checkParcelClick() {
      let parcelFeature = event.features?.find(
        (f) => f.layer.id === "parcels-layer"
      );
      if (parcelFeature) {
        setSelectedParcelId(parcelFeature.properties.parcelId);
        setInteractionState(STATE_PARCEL_SELECTED);
        return true;
      } else if (parcelHoverId) {
        setSelectedParcelId(parcelHoverId);
        setInteractionState(STATE_PARCEL_SELECTED);
        return true;
      } else {
        let gwCoord = GeoWebCoordinate.from_gps(
          event.lngLat[0],
          event.lngLat[1]
        );

        if (existingCoords.has(gwCoord.toString(10))) {
          return true;
        }
      }

      return false;
    }

    switch (interactionState) {
      case STATE_VIEWING:
        if (_checkParcelClick()) {
          return;
        }

        let gwCoord = GeoWebCoordinate.from_gps(
          event.lngLat[0],
          event.lngLat[1]
        );
        let coord = {
          x: GeoWebCoordinate.get_x(gwCoord).toNumber(),
          y: GeoWebCoordinate.get_y(gwCoord).toNumber(),
        };

        setClaimBase1Coord(coord);
        setClaimBase2Coord(coord);
        setInteractionState(STATE_CLAIM_SELECTING);

        let nextViewport = {
          latitude: event.lngLat[1],
          longitude: event.lngLat[0],
          zoom: ZOOM_GRID_LEVEL + 1,
          transitionDuration: 500,
        };
        setViewport(nextViewport);
        _onViewportChange(nextViewport);
        break;
      case STATE_CLAIM_SELECTING:
        if (!isValidClaim) {
          break;
        }
        if (gridFeature) {
          setClaimBase2Coord({
            x: gridFeature.properties.gwCoordX,
            y: gridFeature.properties.gwCoordY,
          });
        }
        setInteractionState(STATE_CLAIM_SELECTED);
        break;
      case STATE_CLAIM_SELECTED:
        setInteractionState(STATE_VIEWING);
        break;
      case STATE_PARCEL_SELECTED:
        if (_checkParcelClick()) {
          return;
        }
        setInteractionState(STATE_VIEWING);
        break;
      default:
        break;
    }
  }

  useEffect(() => {
    if (data && data.geoWebCoordinates.length > 0) {
      // Fetch more coordinates
      let newLastBlock =
        data.geoWebCoordinates[data.geoWebCoordinates.length - 1]
          .createdAtBlock;

      fetchMore({
        variables: {
          lastBlock: newLastBlock,
        },
      });
    }

    switch (interactionState) {
      case STATE_VIEWING:
        setClaimBase1Coord(null);
        setClaimBase2Coord(null);
        setSelectedParcelId("");
        setParcelHoverId("");
      case STATE_PARCEL_SELECTED:
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
      let _existingCoords = new Set(
        data.geoWebCoordinates.flatMap((p) => p.id)
      );
      setExistingCoords(_existingCoords);
    }

    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInteractionState(STATE_VIEWING);
      }
    };
    window.addEventListener("keydown", listener);

    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, [data]);

  return (
    <>
      {/* {interactionState != STATE_VIEWING ? (
        <Sidebar
          licenseContract={licenseContract}
          accountantContract={accountantContract}
          claimerContract={claimerContract}
          collectorContract={collectorContract}
          purchaserContract={purchaserContract}
          account={account}
          interactionState={interactionState}
          setInteractionState={setInteractionState}
          claimBase1Coord={claimBase1Coord}
          claimBase2Coord={claimBase2Coord}
          selectedParcelId={selectedParcelId}
          setSelectedParcelId={setSelectedParcelId}
          ceramic={ceramic}
          ipfs={ipfs}
          firebasePerf={firebasePerf}
        ></Sidebar>
      ) : null} */}
      <Col sm="9" className="px-0">
        <div
          id="geocoder"
          ref={geocoderContainerRef}
          style={{ position: "absolute", top: "14vh", left: "81vw", zIndex: 1 }}
        />
        <ReactMapGL
          ref={mapRef}
          {...viewport}
          width={interactionState != STATE_VIEWING ? "75vw" : "100vw"}
          height={interactionState != STATE_VIEWING ? "100vh" : "100vh"}
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
          <GridHoverSource gridHoverCoord={gridHoverCoord}></GridHoverSource>
          <ParcelSource
            data={data}
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
        style={{ position: "absolute", bottom: "4%", right: "2%", radius: 12 }}
        aria-label="Basic example"
      >
        <Button
          style={{
            backgroundColor: mapStyleName === "street" ? "#2fc1c1" : "#202333",
          }}
          variant="secondary"
          onClick={() => handleMapstyle("street")}
        >
          <img src={"street_ic.png"} style={{ height: 30, width: 30 }} />
        </Button>
        <Button
          style={{
            backgroundColor:
              mapStyleName === "satellite" ? "#2fc1c1" : "#202333",
          }}
          variant="secondary"
          onClick={() => handleMapstyle("satellite")}
        >
          <img src={"satellite_ic.png"} style={{ height: 30, width: 30 }} />
        </Button>
      </ButtonGroup>
      );
    </>
  );
}

export default Map;
