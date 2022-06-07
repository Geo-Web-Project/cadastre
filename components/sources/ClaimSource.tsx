import * as React from "react";
import { Source, Layer } from "react-map-gl";
import { claimLayer } from "../map-style";
import { Coord, coordToFeature, GW_MAX_LAT, GW_MAX_LON } from "../Map";
import { GeoWebCoordinate } from "js-geo-web-coordinate";

type Props = {
  existingCoords: Set<string>;
  claimBase1Coord: Coord | null;
  claimBase2Coord: Coord | null;
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
          const gwCoord = GeoWebCoordinate.fromXandY(
            _x,
            _y,
            GW_MAX_LON,
            GW_MAX_LAT
          );
          _features.add(coordToFeature(gwCoord));

          if (existingCoords.has(gwCoord.toString())) {
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
