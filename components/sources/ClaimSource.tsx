import { useMemo, useEffect } from "react";
import { Source, Layer } from "react-map-gl";
import { claimLayer } from "../map-style";
import { Coord, coordToFeature, GW_MAX_LAT, GW_MAX_LON } from "../Map";
import { GeoWebCoordinate } from "js-geo-web-coordinate";
import { MAX_PARCEL_CLAIM } from "../../lib/constants";
import type { MultiPolygon, Polygon } from "@turf/turf";
import * as turf from "@turf/turf";
import { coordToPolygon } from "./ParcelSource";
import { BigNumber } from "ethers";

type Props = {
  existingMultiPoly: MultiPolygon | Polygon;
  claimBase1Coord: Coord | null;
  claimBase2Coord: Coord | null;
  isValidClaim: boolean;
  setIsValidClaim: React.Dispatch<React.SetStateAction<boolean>>;
  parcelClaimSize: number;
  setParcelClaimSize: React.Dispatch<React.SetStateAction<number>>;
};

function ClaimSource(props: Props) {
  const {
    existingMultiPoly,
    claimBase1Coord,
    claimBase2Coord,
    isValidClaim,
    setIsValidClaim,
    parcelClaimSize,
    setParcelClaimSize,
  } = props;

  const geoJsonFeatures = useMemo(() => {
    const _features = [];
    let polygon: MultiPolygon | Polygon = turf.multiPolygon([]).geometry;
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
          _features.push(coordToFeature(gwCoord));
          polygon = turf.union(polygon, coordToPolygon(gwCoord))!.geometry;
        }
      }
    }
    return { _features, polygon };
  }, [claimBase1Coord, claimBase2Coord]);

  useEffect(() => {
    let _isValid = true;
    const intersection = turf.intersect(
      geoJsonFeatures.polygon,
      existingMultiPoly
    );
    const bboxInter = intersection ? turf.bbox(intersection) : null;

    // Correct for detecting border intersection
    if (
      (bboxInter &&
        bboxInter[3] - bboxInter[1] > 180 / 2 ** (GW_MAX_LAT + 1)) ||
      parcelClaimSize > MAX_PARCEL_CLAIM
    ) {
      _isValid = false;
    }

    setIsValidClaim(_isValid);
    setParcelClaimSize(geoJsonFeatures._features.length);
  }, [existingMultiPoly, setIsValidClaim, setParcelClaimSize, geoJsonFeatures]);

  return (
    <Source
      id="claim-data"
      type="geojson"
      data={{
        type: "FeatureCollection",
        features: geoJsonFeatures._features,
      }}
    >
      <Layer {...claimLayer(isValidClaim)} />
    </Source>
  );
}

export default ClaimSource;
