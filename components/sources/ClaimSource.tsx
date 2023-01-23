import { useMemo, useEffect } from "react";
import { Source, Layer } from "react-map-gl";
import { claimLayer } from "../map-style";
import {
  Coord,
  GeoWebCoordinate,
  coordToFeature,
  GW_CELL_SIZE_LON,
  GW_CELL_SIZE_LAT,
  GW_MAX_LAT,
  GW_MAX_LON,
} from "../Map";
import { MAX_PARCEL_CLAIM } from "../../lib/constants";
import type { MultiPolygon, Polygon } from "@turf/turf";
import * as turf from "@turf/turf";

const MAX_PARCEL_DIM = 200;

type Props = {
  geoWebCoordinate: GeoWebCoordinate;
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
    geoWebCoordinate,
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

    if (claimBase1Coord && claimBase2Coord) {
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
          const gwCoord = geoWebCoordinate.make_gw_coord(_x, _y);
          const coords = geoWebCoordinate.to_gps(
            gwCoord,
            GW_MAX_LAT,
            GW_MAX_LON
          );
          const gwCoordX = geoWebCoordinate.get_x(gwCoord);
          const gwCoordY = geoWebCoordinate.get_y(gwCoord);

          _features.push(coordToFeature(gwCoord, coords, gwCoordX, gwCoordY));
        }
      }
    } else if (claimBase1Coord && !claimBase2Coord) {
      const gwCoord = geoWebCoordinate.make_gw_coord(
        claimBase1Coord.x,
        claimBase1Coord.y
      );
      const coords = geoWebCoordinate.to_gps(gwCoord, GW_MAX_LAT, GW_MAX_LON);
      const gwCoordX = geoWebCoordinate.get_x(gwCoord);
      const gwCoordY = geoWebCoordinate.get_y(gwCoord);

      _features.push(coordToFeature(gwCoord, coords, gwCoordX, gwCoordY));
    }

    return { _features };
  }, [claimBase1Coord, claimBase2Coord]);

  useEffect(() => {
    let _isValid = true;

    const bbox = turf.bbox({
      type: "FeatureCollection",
      features: geoJsonFeatures._features,
    });
    const polygon = turf.bboxPolygon(bbox).geometry;
    const intersection = turf.intersect(polygon, existingMultiPoly);
    const bboxInter = intersection ? turf.bbox(intersection) : null;

    // Correct for detecting border intersection
    const overlapX =
      bboxInter && bboxInter[2] - bboxInter[0] > 360 / (1 << GW_CELL_SIZE_LON);
    const overlapY =
      bboxInter && bboxInter[3] - bboxInter[1] > 180 / (1 << GW_CELL_SIZE_LAT);

    if ((overlapX && overlapY) || parcelClaimSize > MAX_PARCEL_CLAIM) {
      _isValid = false;
    } else {
      if (claimBase1Coord && claimBase2Coord) {
        const swX = Math.min(claimBase1Coord.x, claimBase2Coord.x);
        const swY = Math.min(claimBase1Coord.y, claimBase2Coord.y);
        const neX = Math.max(claimBase1Coord.x, claimBase2Coord.x);
        const neY = Math.max(claimBase1Coord.y, claimBase2Coord.y);

        const lngDim = neX - swX + 1;
        const latDim = neY - swY + 1;

        if (lngDim > MAX_PARCEL_DIM || latDim > MAX_PARCEL_DIM) {
          _isValid = false;
        }
      }
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
