import * as React from "react";
import { Source, Layer } from "react-map-gl";
import { parcelLayer, parcelHighlightLayer } from "../map-style.js";
import { convertToGeoJson } from "../Map";
import { gql, useQuery } from "@apollo/client";

const query = gql`
  {
    landParcels(first: 5) {
      id
      geometry {
        type
        coordinates {
          pointBR {
            lon
            lat
          }
          pointBL {
            lon
            lat
          }
          pointTR {
            lon
            lat
          }
          pointTL {
            lon
            lat
          }
        }
      }
    }
  }
`;

function ParcelSource({ parcelHoverId }) {
  const { loading, data } = useQuery(query);

  return (
    <>
      {data != null ? (
        <Source
          id="parcel-data"
          type="geojson"
          data={{
            type: "FeatureCollection",
            features: convertToGeoJson(data),
          }}
        >
          <Layer {...parcelLayer} />
          <Layer
            {...parcelHighlightLayer}
            filter={["==", "parcelId", parcelHoverId]}
          />
        </Source>
      ) : null}
    </>
  );
}

export default ParcelSource;
