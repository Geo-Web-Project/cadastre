import * as React from "react";
import { Source, Layer } from "react-map-gl";
import { gridLayer } from "../map-style.js";
import { ZOOM_GRID_LEVEL } from "../Map";

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
          {/* {claimBase1Coord != null && claimBase2Coord != null ? (
         <Layer
           {...claimLayer}
           filter={[
             "all",
             [">=", "gwCoordX", Math.min(claimBase1Coord.x, claimBase2Coord.x)],
             [">=", "gwCoordY", Math.min(claimBase1Coord.y, claimBase2Coord.y)],
             ["<=", "gwCoordX", Math.max(claimBase1Coord.x, claimBase2Coord.x)],
             ["<=", "gwCoordY", Math.max(claimBase1Coord.y, claimBase2Coord.y)],
           ]}
         />
       ) : null} */}
        </Source>
      ) : null}
    </>
  );
}

export default GridSource;
