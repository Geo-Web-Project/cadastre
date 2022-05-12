/* eslint-disable import/no-unresolved */
import GeoJSON from "geojson";
import * as React from "react";
import { Source, Layer } from "react-map-gl";
import { PolygonQuery } from "../Map";
import { parcelLayer, parcelHighlightLayer } from "../map-style";

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
};

function ParcelSource(props: Props) {
  const { data, parcelHoverId, selectedParcelId } = props;
  const [geoJsonFeatures, setGeoJsonFeatures] = React.useState<
    GeoJSON.Feature[]
  >([]);

  React.useEffect(() => {
    if (data != null) {
      setGeoJsonFeatures(convertToGeoJson(data));
    }
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
    </Source>
  );
}

export default ParcelSource;
