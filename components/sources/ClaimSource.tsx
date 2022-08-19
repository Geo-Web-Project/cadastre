import { useMemo, useEffect } from "react";
import { Source, Layer } from "react-map-gl";
import { claimLayer } from "../map-style";
import { Coord, coordToFeature, GW_MAX_LAT, GW_MAX_LON } from "../Map";
import { GeoWebCoordinate } from "js-geo-web-coordinate";
import { MAX_PARCEL_CLAIM } from "../../lib/constants";

type Props = {
  existingCoords: Set<string>;
  claimBase1Coord: Coord | null;
  claimBase2Coord: Coord | null;
  isValidClaim: boolean;
  setIsValidClaim: React.Dispatch<React.SetStateAction<boolean>>;
  parcelClaimSize: number;
  setParcelClaimSize: React.Dispatch<React.SetStateAction<number>>;
};

function ClaimSource(props: Props) {
  const {
    existingCoords,
    claimBase1Coord,
    claimBase2Coord,
    isValidClaim,
    setIsValidClaim,
    parcelClaimSize,
    setParcelClaimSize,
  } = props;

  let gwCoord: GeoWebCoordinate | null = null;

  const geoJsonFeatures = useMemo(() => {
    const _features = [];
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
          gwCoord = GeoWebCoordinate.fromXandY(_x, _y, GW_MAX_LON, GW_MAX_LAT);
          _features.push(coordToFeature(gwCoord));
        }
      }
    }
    return _features;
  }, [claimBase1Coord, claimBase2Coord]);

  useEffect(() => {
    let _isValid = true;
    if (
      (gwCoord && existingCoords.has(gwCoord.toString())) ||
      parcelClaimSize > MAX_PARCEL_CLAIM
    ) {
      _isValid = false;
    }

    setIsValidClaim(_isValid);
    setParcelClaimSize(geoJsonFeatures.length);
  }, [existingCoords, setIsValidClaim, setParcelClaimSize, geoJsonFeatures]);

  return (
    <Source
      id="claim-data"
      type="geojson"
      data={{
        type: "FeatureCollection",
        features: geoJsonFeatures,
      }}
    >
      <Layer {...claimLayer(isValidClaim)} />
    </Source>
  );
}

export default ClaimSource;
