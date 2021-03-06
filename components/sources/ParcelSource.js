import * as React from "react";
import { Source, Layer } from "react-map-gl";
import { parcelLayer, parcelHighlightLayer } from "../map-style.js";

function convertToGeoJson(data) {
  let features = data.geoWebCoordinates.map((c) => {
    let coordinates = [
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

function ParcelSource({ data, parcelHoverId, selectedParcelId }) {
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
