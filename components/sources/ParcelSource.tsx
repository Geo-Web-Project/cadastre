import type GeoJSON from "geojson";
import { useMemo } from "react";
import { Source, Layer } from "react-map-gl";
import { PolygonQuery } from "../Map";
import {
  parcelLayer,
  parcelHighlightLayer,
  parcelInvalidLayer,
} from "../map-style";

function convertToGeoJson(data: PolygonQuery): GeoJSON.Feature[] {
  const features: GeoJSON.Feature[] = data.geoWebParcels.map((p) => {
    const coordinates = p.coordinates.reduce(
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
      [[]] as GeoJSON.Position[]
    );
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [coordinates],
      },
      properties: {
        parcelId: p.id,
      },
    };
  });
  console.log(features);
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
