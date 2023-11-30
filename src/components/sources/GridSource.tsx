import * as React from "react";
import { Source, Layer } from "react-map-gl";
import { gridLayer } from "../map-style";
import type GeoJSON from "geojson";

type Props = {
  isGridVisible: boolean;
  grid: Grid | null;
};

export type Grid = {
  center: {
    x: number;
    y: number;
  };
  features: Array<GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>>;
};

function GridSource(props: Props) {
  const { isGridVisible, grid } = props;
  let gridFeatures: Array<
    GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>
  > = [];
  if (grid != null && isGridVisible) {
    gridFeatures = grid.features;
  }

  return (
    <>
      {grid != null ? (
        <Source
          id="grid-data"
          type="geojson"
          data={{
            type: "FeatureCollection",
            features: gridFeatures,
          }}
        >
          <Layer {...gridLayer} />
        </Source>
      ) : null}
    </>
  );
}

export default GridSource;
