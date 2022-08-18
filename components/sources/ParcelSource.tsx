/* eslint-disable import/no-unresolved */
import GeoJSON from "geojson";
import { useMemo } from "react";
import { Source, Layer } from "react-map-gl";
import { PolygonQuery } from "../Map";
import {
  parcelLayer,
  parcelHighlightLayer,
  parcelInvalidLayer,
} from "../map-style";

function convertToGeoJson(data: PolygonQuery): GeoJSON.Feature[] {
  const features: GeoJSON.Feature[] = data.geoWebCoordinates.map((c) => {
    const coordinates = [
      [
        [c.pointBL.lon, c.pointBL.lat],
        [c.pointBR.lon, c.pointBR.lat],
        [c.pointTR.lon, c.pointTR.lat],
        [c.pointTL.lon, c.pointTL.lat],
      ],
    ];
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: coordinates,
      },
      properties: {
        parcelId: c.landParcel.id,
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
  const {
    data,
    parcelHoverId,
    selectedParcelId,
    isAvailable,
    invalidLicenseId,
  } = props;

  const geoJsonFeatures = useMemo(() => {
    let features = [];
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
      <Layer
        {...parcelHighlightLayer}
        filter={[
          "any",
          ["==", "parcelId", parcelHoverId],
          ["==", "parcelId", selectedParcelId],
        ]}
      />
      {invalidLicenseId == selectedParcelId && (
        <Layer
          {...parcelInvalidLayer}
          filter={["==", "parcelId", selectedParcelId]}
        />
      )}
    </Source>
  );
}

export default ParcelSource;
