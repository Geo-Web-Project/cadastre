import * as React from "react";
import { Source, Layer } from "react-map-gl";
import { gridHighlightLayer } from "../map-style.js";
import { coordToFeature } from "../Map";
import BN from "bn.js";

type Props = {
  gridHoverCoord: any;
};
function GridHoverSource(props: Props) {
  const { gridHoverCoord } = props;
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
