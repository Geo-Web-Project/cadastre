import * as React from "react";
import { Source, Layer } from "react-map-gl";
import { parcelLayer, parcelHighlightLayer } from "../map-style.js";

function convertToGeoJson(data) {
  let features = data.landParcels.map((parcel) => {
    let coordinates = parcel.geometry.coordinates.map((c) => {
      return [
        [
          [c.pointBL.lon, c.pointBL.lat],
          [c.pointBR.lon, c.pointBR.lat],
          [c.pointTR.lon, c.pointTR.lat],
          [c.pointTL.lon, c.pointTL.lat],
        ],
      ];
    });
    return {
      type: "Feature",
      geometry: {
        type: "MultiPolygon",
        coordinates: coordinates,
      },
      properties: {
        parcelId: parcel.id,
      },
    };
  });
  return features;
}

function ParcelSource({ data, parcelHoverId }) {
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
        filter={["==", "parcelId", parcelHoverId]}
      />
    </Source>
  );
}

export default ParcelSource;
