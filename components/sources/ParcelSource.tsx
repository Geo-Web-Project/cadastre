import type GeoJSON from "geojson";
import { useMemo } from "react";
import { Source, Layer } from "react-map-gl";
import { PolygonQuery, GeoWebParcel } from "../Map";
import {
  parcelLayer,
  parcelHighlightLayer,
  parcelInvalidLayer,
} from "../map-style";
import type { Polygon, MultiPolygon, Position } from "@turf/turf";
import { GeoWebCoordinate } from "js-geo-web-coordinate";
import * as turf from "@turf/turf";

export function coordToPolygon(gwCoord: GeoWebCoordinate): Polygon {
  const coords = gwCoord.toGPS();
  return turf.polygon([[...coords, coords[0]]]).geometry;
}

export function parcelsToMultiPoly(data: PolygonQuery): MultiPolygon | Polygon {
  const polygons: (MultiPolygon | Polygon)[] =
    data.geoWebParcels.map(parcelToPolygon);

  return polygons.reduce((prev, cur) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return turf.union(prev, cur)!.geometry;
  }, turf.multiPolygon([]).geometry);
}

function parcelToPolygon(parcel: GeoWebParcel): Polygon {
  const coordinates = parcel.coordinates
    .map((c) => Number(c))
    .reduce(
      (prev, cur) => {
        const last = prev[prev.length - 1];
        if (last.length < 2) {
          last.push(cur);
          prev[prev.length - 1] = last;
        } else {
          prev.push([cur]);
        }
        return prev;
      },
      [[]] as Position[]
    );
  return turf.polygon([coordinates]).geometry;
}

function convertToGeoJson(data: PolygonQuery): GeoJSON.Feature[] {
  const features: GeoJSON.Feature[] = data.geoWebParcels.map((p) => {
    return {
      type: "Feature",
      geometry: parcelToPolygon(p),
      properties: {
        parcelId: p.id,
      },
    };
  });
  return features;
}

type Props = {
  data: PolygonQuery | null;
  parcelHoverId: string;
  selectedParcelId: string;
  isAvailable: boolean;
  invalidLicenseId: string;
};

function ParcelSource(props: Props) {
  const { data, parcelHoverId, selectedParcelId, invalidLicenseId } = props;

  const geoJsonFeatures = useMemo(() => {
    let features: GeoJSON.Feature[] = [];
    if (data !== null) {
      features = convertToGeoJson(data);
    }
    return features;
  }, [data]);

  return (
    <Source
      id="parcel-data"
      type="geojson"
      data={{
        type: "FeatureCollection",
        features: geoJsonFeatures,
      }}
    >
      <Layer {...parcelLayer} />
      <Layer {...parcelHighlightLayer(parcelHoverId, selectedParcelId)} />
      {invalidLicenseId == selectedParcelId && (
        <Layer {...parcelInvalidLayer(selectedParcelId)} />
      )}
    </Source>
  );
}

export default ParcelSource;
