import * as React from "react";
import { useState } from "react";
import ReactMapGL, { Source, Layer } from "react-map-gl";
import { BN } from "bn.js";
import GridSource from "./sources/GridSource";
import ParcelSource from "./sources/ParcelSource";
import GridHoverSource from "./sources/GridHoverSource";
import ClaimSource from "./sources/ClaimSource";

import {
  gridHighlightLayer,
  parcelLayer,
  parcelHighlightLayer,
  claimLayer,
} from "./map-style.js";

const GeoWebCoordinate = require("js-geo-web-coordinate");

export const ZOOM_GRID_LEVEL = 18;
const GRID_DIM = 100;

const STATE_VIEWING = 0;
const STATE_CLAIM_SELECTING = 1;
const STATE_CLAIM_SELECTED = 2;

export function convertToGeoJson(data) {
  let features = data.landParcels.map((parcel) => {
    let coordinates = parcel.geometry.coordinates.map((c) => {
      return [
        [
          [c.pointBL.lon, c.pointBL.lat],
          [c.pointBR.lon, c.pointBR.lat],
          [c.pointTR.lon, c.pointTR.lat],
          [c.pointTL.lon, c.pointTL.lat],
        ],
      ];
    });
    return {
      type: "Feature",
      geometry: {
        type: "MultiPolygon",
        coordinates: coordinates,
      },
      properties: {
        parcelId: parcel.id,
      },
    };
  });
  return features;
}

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

function Map() {
  const [viewport, setViewport] = useState({
    width: "100vw",
    height: "100vh",
    latitude: 46.785869,
    longitude: -121.735288,
    zoom: 19,
  });
  const [grid, setGrid] = useState(null);
  const [interactionState, setInteractionState] = useState(STATE_VIEWING);
  const [gridHoverCoord, setGridHoverCoord] = useState("");
  const [parcelHoverId, setParcelHoverId] = useState("");

  const [claimBase1Coord, setClaimBase1Coord] = useState(null);
  const [claimBase2Coord, setClaimBase2Coord] = useState(null);

  let isGridVisible = viewport.zoom >= ZOOM_GRID_LEVEL;

  function onHover(event) {
    if (event.features == null) {
      return;
    }

    switch (interactionState) {
      case STATE_VIEWING:
        let parcelFeature = event.features.find(
          (f) => f.layer.id === "parcels-layer"
        );
        if (parcelFeature) {
          setParcelHoverId(parcelFeature.properties.parcelId);
          setGridHoverCoord("");
        } else if (isGridVisible) {
          let gridFeature = event.features.find(
            (f) => f.layer.id === "grid-layer"
          );
          if (gridFeature) {
            setGridHoverCoord(gridFeature.properties.gwCoord);
            setParcelHoverId("");
          }
        } else {
          setParcelHoverId("");
        }
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
      default:
        break;
    }
  }

  function onClick(event) {
    if (parcelHoverId) {
      // TODO: Click on parcel
      return;
    }

    switch (interactionState) {
      case STATE_VIEWING:
        let gridFeature = event.features.find(
          (f) => f.layer.id === "grid-layer"
        );

        let coord;
        if (gridFeature) {
          coord = {
            x: gridFeature.properties.gwCoordX,
            y: gridFeature.properties.gwCoordY,
          };
        } else {
          coord = {
            x: GeoWebCoordinate.get_x(new BN(gridHoverCoord, 16)).toNumber(),
            y: GeoWebCoordinate.get_y(new BN(gridHoverCoord, 16)).toNumber(),
          };
        }

        setClaimBase1Coord(coord);
        setClaimBase2Coord(coord);
        setInteractionState(STATE_CLAIM_SELECTING);
        break;
      case STATE_CLAIM_SELECTING:
        setInteractionState(STATE_CLAIM_SELECTED);
        break;
      default:
        break;
    }
  }

  return (
    <ReactMapGL
      {...viewport}
      mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
      mapStyle="mapbox://styles/mapbox/satellite-v9"
      onViewportChange={(nextViewport) => {
        setViewport(nextViewport);
        updateGrid(viewport.latitude, viewport.longitude, grid, setGrid);
      }}
      onHover={onHover}
      onClick={onClick}
    >
      <GridSource grid={grid} isGridVisible={isGridVisible}></GridSource>
      <GridHoverSource gridHoverCoord={gridHoverCoord}></GridHoverSource>
      <ParcelSource parcelHoverId={parcelHoverId}></ParcelSource>
      <ClaimSource
        claimBase1Coord={claimBase1Coord}
        claimBase2Coord={claimBase2Coord}
      ></ClaimSource>
    </ReactMapGL>
  );
}

export default Map;
