import * as React from "react";
import { Source, Layer } from "react-map-gl";
import { claimLayer } from "../map-style.js";
import { coordToFeature } from "../Map";
const GeoWebCoordinate = require("js-geo-web-coordinate");

function ClaimSource({ claimBase1Coord, claimBase2Coord }) {
  let features = [];
  if (claimBase1Coord != null && claimBase2Coord != null) {
    for (
      let _x = Math.min(claimBase1Coord.x, claimBase2Coord.x);
      _x <= Math.max(claimBase1Coord.x, claimBase2Coord.x);
      _x++
    ) {
      for (
        let _y = Math.min(claimBase1Coord.y, claimBase2Coord.y);
        _y <= Math.max(claimBase1Coord.y, claimBase2Coord.y);
        _y++
      ) {
        features.push(coordToFeature(GeoWebCoordinate.make_gw_coord(_x, _y)));
      }
    }
  }

  return (
    <>
      {claimBase1Coord != null && claimBase2Coord != null ? (
        <Source
          id="claim-data"
          type="geojson"
          data={{
            type: "FeatureCollection",
            features: features,
          }}
        >
          <Layer {...claimLayer} />
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

export default ClaimSource;
