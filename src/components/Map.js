import * as React from "react";
import { useState } from "react";
import ReactMapGL, { Source, Layer } from "react-map-gl";
import { gql, useQuery } from "@apollo/client";

import {
  gridLayer,
  gridHighlightLayer,
  parcelLayer,
  parcelHighlightLayer,
} from "./map-style.js";

const GeoWebCoordinate = require("js-geo-web-coordinate");

const ZOOM_GRID_LEVEL = 19;
const GRID_DIM = 50;

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
    },
  };
}

function onHover(event, setGridHoverCoord, setParcelHoverId) {
  if (event.features) {
    let parcelFeature = event.features.find(
      (f) => f.layer.id === "parcels-layer"
    );
    if (parcelFeature) {
      setParcelHoverId(parcelFeature.properties.parcelId);
      setGridHoverCoord("");
    } else {
      let gridFeature = event.features.find((f) => f.layer.id === "grid-layer");
      if (gridFeature) {
        setGridHoverCoord(gridFeature.properties.gwCoord);
        setParcelHoverId("");
      }
    }
  }
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
  const [gridHoverCoord, setGridHoverCoord] = useState("");
  const [parcelHoverId, setParcelHoverId] = useState("");

  let gridFeatures = [];
  if (grid != null && viewport.zoom >= ZOOM_GRID_LEVEL) {
    gridFeatures = grid.features;
  }

  return (
    <ReactMapGL
      {...viewport}
      mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
      mapStyle="mapbox://styles/mapbox/streets-v11"
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
      onHover={(e) => onHover(e, setGridHoverCoord, setParcelHoverId)}
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
