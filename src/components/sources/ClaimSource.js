import * as React from "react";
import { Source, Layer } from "react-map-gl";
import { claimLayer } from "../map-style.js";
import { coordToFeature } from "../Map";
const GeoWebCoordinate = require("js-geo-web-coordinate");

function ClaimSource({ claimBase1Coord, claimBase2Coord, data }) {
  const [existingCoords, setExistingCoords] = React.useState(new Set());

  React.useEffect(() => {
    if (data != null) {
      let _existingCoords = new Set(
        data.landParcels.flatMap((parcel) => {
          return parcel.geometry.coordinates.map((c) => c.id);
        })
      );
      setExistingCoords(_existingCoords);
    }
  }, [data]);

  let features = [];
  let isValid = true;
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
        let gwCoord = GeoWebCoordinate.make_gw_coord(_x, _y);
        features.push(coordToFeature(gwCoord));

        if (existingCoords.has(gwCoord.toString(10))) {
          isValid = false;
        }
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
          <Layer {...claimLayer(isValid)} />
        </Source>
      ) : null}
    </>
  );
}

export default ClaimSource;
