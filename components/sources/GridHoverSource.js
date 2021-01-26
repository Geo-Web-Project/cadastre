import * as React from "react";
import { Source, Layer } from "react-map-gl";
import { gridHighlightLayer } from "../map-style.js";
import { coordToFeature } from "../Map";
import { BN } from "bn.js";

function GridHoverSource({ gridHoverCoord }) {
  return (
    <>
      {gridHoverCoord != null ? (
        <Source
          id="grid-hover-data"
          type="geojson"
          data={coordToFeature(new BN(gridHoverCoord, 16))}
        >
          <Layer {...gridHighlightLayer} />
        </Source>
      ) : null}
    </>
  );
}

export default GridHoverSource;
