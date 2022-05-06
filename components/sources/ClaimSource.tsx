/* eslint-disable import/no-unresolved */
import * as React from "react";
import { Source, Layer } from "react-map-gl";
import { claimLayer } from "../map-style";
import { coordToFeature } from "../Map";
import GeoWebCoordinate from "js-geo-web-coordinate";

type Props = {
  existingCoords: Set<any>;
  claimBase1Coord: any;
  claimBase2Coord: any;
  isValidClaim: boolean;
  setIsValidClaim: React.Dispatch<React.SetStateAction<boolean>>;
};

function ClaimSource(props: Props) {
  const {
    existingCoords,
    claimBase1Coord,
    claimBase2Coord,
    isValidClaim,
    setIsValidClaim,
  } = props;
  const [features, setFeatures] = React.useState<Set<any>>(new Set());

  React.useEffect(() => {
    const _features = new Set();
    let _isValid = true;
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
          const gwCoord = GeoWebCoordinate.make_gw_coord(_x, _y);
          _features.add(coordToFeature(gwCoord));

          if (existingCoords.has(gwCoord.toString(10))) {
            _isValid = false;
          }
        }
      }
    }

    setFeatures(_features);
    setIsValidClaim(_isValid);
  }, [claimBase1Coord, claimBase2Coord, existingCoords, setIsValidClaim]);

  return (
    <Source
      id="claim-data"
      type="geojson"
      data={{
        type: "FeatureCollection",
        features: Array.from(features),
      }}
    >
      <Layer {...claimLayer(isValidClaim)} />
    </Source>
  );
}

export default ClaimSource;
