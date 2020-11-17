import * as React from "react";
import { useState } from "react";
import ReactMapGL, { Source, Layer } from "react-map-gl";
import { gql, useQuery } from "@apollo/client";
import { BN } from "bn.js";

import {
  gridLayer,
  gridHighlightLayer,
  parcelLayer,
  parcelHighlightLayer,
  claimLayer,
} from "./map-style.js";

const GeoWebCoordinate = require("js-geo-web-coordinate");

const ZOOM_GRID_LEVEL = 19;
const GRID_DIM = 50;

const STATE_VIEWING = 0;
const STATE_CLAIMING = 1;

const query = gql`
  {
    landParcels(first: 5) {
      id
      geometry {
        type
        coordinates {
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
    }
  }
`;

function convertToGeoJson(data) {
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

function updateGrid(lat, lon, zoom, oldGrid, setGrid) {
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
      features.push(coordToFeature(_x, _y));
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

function coordToFeature(x, y) {
  let gwCoord = GeoWebCoordinate.make_gw_coord(x, y);
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
  const { loading, data } = useQuery(query);
  const [viewport, setViewport] = useState({
    width: "100vw",
    height: "100vh",
    latitude: 46.785869,
    longitude: -121.735288,
    zoom: 20,
  });
  const [grid, setGrid] = useState(null);
  const [interactionState, setInteractionState] = useState(STATE_VIEWING);
  const [gridHoverCoord, setGridHoverCoord] = useState("");
  const [parcelHoverId, setParcelHoverId] = useState("");

  const [claimBase1Coord, setClaimBase1Coord] = useState(null);
  const [claimBase2Coord, setClaimBase2Coord] = useState(null);

  let isGridVisible = viewport.zoom >= ZOOM_GRID_LEVEL;
  let gridFeatures = [];
  if (grid != null && isGridVisible) {
    gridFeatures = grid.features;
  }

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
      case STATE_CLAIMING:
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
        let coord = {
          x: GeoWebCoordinate.get_x(new BN(gridHoverCoord, 16)).toNumber(),
          y: GeoWebCoordinate.get_y(new BN(gridHoverCoord, 16)).toNumber(),
        };
        setClaimBase1Coord(coord);
        setClaimBase2Coord(coord);
        setInteractionState(STATE_CLAIMING);
        break;
      case STATE_CLAIMING:
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
        updateGrid(
          viewport.latitude,
          viewport.longitude,
          viewport.zoom,
          grid,
          setGrid
        );
      }}
      onHover={onHover}
      onClick={onClick}
    >
      {grid != null ? (
        <Source
          id="grid-data"
          type="geojson"
          data={{
            type: "FeatureCollection",
            features: gridFeatures,
          }}
        >
          <Layer {...gridLayer} />
          <Layer
            {...gridHighlightLayer}
            filter={["==", "gwCoord", gridHoverCoord]}
          />
          {claimBase1Coord != null && claimBase2Coord != null ? (
            <Layer
              {...claimLayer}
              filter={[
                "all",
                [">=", "gwCoordX", claimBase1Coord.x],
                [">=", "gwCoordY", claimBase1Coord.y],
                ["<=", "gwCoordX", claimBase2Coord.x],
                ["<=", "gwCoordY", claimBase2Coord.y],
              ]}
            />
          ) : null}
        </Source>
      ) : null}
      {data != null ? (
        <Source
          id="parcel-data"
          type="geojson"
          data={{
            type: "FeatureCollection",
            features: convertToGeoJson(data),
          }}
        >
          <Layer {...parcelLayer} />
          <Layer
            {...parcelHighlightLayer}
            filter={["==", "parcelId", parcelHoverId]}
          />
        </Source>
      ) : null}
    </ReactMapGL>
  );
}

export default Map;
