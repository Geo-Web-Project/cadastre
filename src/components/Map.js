import * as React from "react";
import { useState, useEffect } from "react";
import ReactMapGL from "react-map-gl";
import GridSource from "./sources/GridSource";
import ParcelSource from "./sources/ParcelSource";
import GridHoverSource from "./sources/GridHoverSource";
import ClaimSource from "./sources/ClaimSource";
import { gql, useQuery } from "@apollo/client";
import Sidebar from "./Sidebar";
import Col from "react-bootstrap/Col";

const GeoWebCoordinate = require("js-geo-web-coordinate");

export const ZOOM_GRID_LEVEL = 14;
const GRID_DIM = 50;

export const STATE_VIEWING = 0;
export const STATE_CLAIM_SELECTING = 1;
export const STATE_CLAIM_SELECTED = 2;
export const STATE_PARCEL_SELECTED = 3;

const query = gql`
  query Polygons($lastID: String, $reloadTrigger: String) {
    geoWebCoordinates(orderBy: id, first: 1000, where: { id_gt: $lastID }) {
      id
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

function updateGrid(lat, lon, oldGrid, setGrid) {
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

export function coordToFeature(gwCoord) {
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

function Map({ adminAddress, adminContract, paymentTokenContract, account }) {
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const { loading, data, fetchMore } = useQuery(query, {
    variables: {
      lastID: "0",
      reloadTrigger: reloadTrigger.toString(),
    },
  });

  // Fetch more until none left
  useEffect(() => {
    if (data == null || data.geoWebCoordinates.length == 0) {
      return;
    }
    let newLastID =
      data.geoWebCoordinates[data.geoWebCoordinates.length - 1].id;

    fetchMore({
      variables: {
        lastID: newLastID,
      },
    });
  }, [data]);

  const [viewport, setViewport] = useState({});
  const [grid, setGrid] = useState(null);
  const [interactionState, setInteractionState] = useState(STATE_VIEWING);
  const [gridHoverCoord, setGridHoverCoord] = useState("");
  const [parcelHoverId, setParcelHoverId] = useState("");

  const [claimBase1Coord, setClaimBase1Coord] = useState(null);
  const [claimBase2Coord, setClaimBase2Coord] = useState(null);

  const [selectedParcelId, setSelectedParcelId] = useState("");

  const [existingCoords, setExistingCoords] = useState(new Set());

  const [isValidClaim, setIsValidClaim] = React.useState(true);

  let isGridVisible =
    viewport.zoom >= ZOOM_GRID_LEVEL &&
    (interactionState == STATE_CLAIM_SELECTING ||
      interactionState == STATE_CLAIM_SELECTED);

  function _onViewportChange(nextViewport) {
    setViewport(nextViewport);

    if (
      (interactionState == STATE_CLAIM_SELECTING ||
        interactionState == STATE_CLAIM_SELECTED) &&
      nextViewport.zoom >= ZOOM_GRID_LEVEL
    ) {
      updateGrid(viewport.latitude, viewport.longitude, grid, setGrid);
    }
  }

  function onHover(event) {
    if (event.features == null || viewport.zoom < 5) {
      return;
    }

    function _checkParcelHover() {
      let parcelFeature = event.features.find(
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

  function onClick(event) {
    if (viewport.zoom < 5) {
      return;
    }

    let gridFeature = event.features.find((f) => f.layer.id === "grid-layer");

    function _checkParcelClick() {
      let parcelFeature = event.features.find(
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

    const listener = (e) => {
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
      {interactionState != STATE_VIEWING ? (
        <Sidebar
          adminAddress={adminAddress}
          adminContract={adminContract}
          paymentTokenContract={paymentTokenContract}
          account={account}
          interactionState={interactionState}
          setInteractionState={setInteractionState}
          claimBase1Coord={claimBase1Coord}
          claimBase2Coord={claimBase2Coord}
          selectedParcelId={selectedParcelId}
          setSelectedParcelId={setSelectedParcelId}
          reloadTrigger={reloadTrigger}
          setReloadTrigger={setReloadTrigger}
        ></Sidebar>
      ) : null}
      <Col sm="9" className="px-0">
        <ReactMapGL
          {...viewport}
          width={interactionState != STATE_VIEWING ? "75vw" : "100vw"}
          height={interactionState != STATE_VIEWING ? "100vh" : "100vh"}
          mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v11"
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
        </ReactMapGL>
      </Col>
    </>
  );
}

export default Map;
