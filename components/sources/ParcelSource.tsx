import * as React from "react";
import { Source, Layer } from "react-map-gl";
import { parcelLayer, parcelHighlightLayer } from "../map-style";

function convertToGeoJson(data: any) {
  const features = data.geoWebCoordinates.map((c: any) => {
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
  data: any | null;
  parcelHoverId: string;
  selectedParcelId: string;
  isAvailable: boolean;
};

function ParcelSource(props: Props) {
  const { data, parcelHoverId, selectedParcelId, isAvailable } = props;
  const [geoJsonFeatures, setGeoJsonFeatures] = React.useState([]);

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
