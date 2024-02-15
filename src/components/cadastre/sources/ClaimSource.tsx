import { useMemo, useEffect } from "react";
import { Source, Layer } from "react-map-gl";
import { claimLayer, claimPointLayer } from "../map-style";
import {
  Coord,
  GeoWebCoordinate,
  coordToFeature,
  ParcelClaimInfo,
  STATE,
  GW_CELL_SIZE_LON,
  GW_CELL_SIZE_LAT,
  GW_MAX_LAT,
  GW_MAX_LON,
} from "../Map";
import { MAX_PARCEL_CLAIM, MAX_PARCEL_SIDE_DIM } from "../../../lib/constants";
import type { MultiPolygon, Polygon } from "@turf/turf";
import * as turf from "@turf/turf";

type Props = {
  geoWebCoordinate: GeoWebCoordinate;
  existingMultiPoly: MultiPolygon | Polygon;
  claimBase1Coord: Coord | null;
  claimBase2Coord: Coord | null;
  isValidClaim: boolean;
  setIsValidClaim: React.Dispatch<React.SetStateAction<boolean>>;
  setParcelClaimInfo: React.Dispatch<React.SetStateAction<ParcelClaimInfo>>;
  interactionState: STATE;
};

function ClaimSource(props: Props) {
  const {
    geoWebCoordinate,
    existingMultiPoly,
    claimBase1Coord,
    claimBase2Coord,
    isValidClaim,
    setIsValidClaim,
    setParcelClaimInfo,
    interactionState,
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

      if (interactionState === STATE.CLAIM_SELECTING) {
        const gwCoordSw = geoWebCoordinate.make_gw_coord(
          Math.min(claimBase1Coord.x, claimBase2Coord.x),
          Math.min(claimBase1Coord.y, claimBase2Coord.y)
        );
        const gwCoordNe = geoWebCoordinate.make_gw_coord(
          Math.max(claimBase1Coord.x, claimBase2Coord.x),
          Math.max(claimBase1Coord.y, claimBase2Coord.y)
        );
        const lngLatSw = geoWebCoordinate.to_gps(
          gwCoordSw,
          GW_MAX_LAT,
          GW_MAX_LON
        );
        const lngLatNe = geoWebCoordinate.to_gps(
          gwCoordNe,
          GW_MAX_LAT,
          GW_MAX_LON
        );
        const points = [];
        const pointSw = lngLatSw[0];
        const pointNe = lngLatNe[2];
        const height = pointNe[1] - pointSw[1];
        const pointNw = [pointSw[0], pointSw[1] + height];
        const pointSe = [pointNe[0], pointNe[1] - height];

        points.push(
          { coords: pointSw, direction: "SW" },
          { coords: pointNe, direction: "NE" },
          { coords: pointNw, direction: "NW" },
          { coords: pointSe, direction: "SE" }
        );

        for (const point of points) {
          const feature: GeoJSON.Feature = {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: point.coords,
            },
            properties: {
              direction: point.direction,
            },
          };
          _features.push(feature);
        }
      }
    }

    return { _features };
  }, [interactionState, claimBase1Coord, claimBase2Coord]);

  useEffect(() => {
    if (!claimBase1Coord || !claimBase2Coord) {
      return;
    }

    let _isValid = true;

    const bbox = turf.bbox({
      type: "FeatureCollection",
      features: geoJsonFeatures._features,
    });
    const polygon = turf.bboxPolygon(bbox).geometry;
    const intersection = turf.intersect(polygon, existingMultiPoly);
    const bboxInter = intersection ? turf.bbox(intersection) : null;

    const swX = Math.min(claimBase1Coord.x, claimBase2Coord.x);
    const swY = Math.min(claimBase1Coord.y, claimBase2Coord.y);
    const neX = Math.max(claimBase1Coord.x, claimBase2Coord.x);
    const neY = Math.max(claimBase1Coord.y, claimBase2Coord.y);
    const lngDim = neX - swX + 1;
    const latDim = neY - swY + 1;
    const parcelClaimArea = lngDim * latDim;

    // Correct for detecting border intersection
    const overlapX =
      bboxInter && bboxInter[2] - bboxInter[0] > 360 / (1 << GW_CELL_SIZE_LON);
    const overlapY =
      bboxInter && bboxInter[3] - bboxInter[1] > 180 / (1 << GW_CELL_SIZE_LAT);

    if (
      (overlapX && overlapY) ||
      lngDim > MAX_PARCEL_SIDE_DIM ||
      latDim > MAX_PARCEL_SIDE_DIM ||
      parcelClaimArea > MAX_PARCEL_CLAIM
    ) {
      _isValid = false;
    }

    setIsValidClaim(_isValid);
    setParcelClaimInfo({ width: lngDim, height: latDim });
  }, [existingMultiPoly, geoJsonFeatures]);

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
      <Layer {...claimPointLayer} />
    </Source>
  );
}

export default ClaimSource;
