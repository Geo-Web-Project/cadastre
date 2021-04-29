import * as React from "react";
import { Source, Layer } from "react-map-gl";
import { gridLayer } from "../map-style.js";

function GridSource({ isGridVisible, grid }) {
  let gridFeatures = [];
  if (grid != null && isGridVisible) {
    gridFeatures = grid.features;
  }

  return (
    <>
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
        </Source>
      ) : null}
    </>
  );
}

export default GridSource;
