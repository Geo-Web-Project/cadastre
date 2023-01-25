import { useMemo } from "react";
import { Source, Layer } from "react-map-gl";
import { cellHoverLayer } from "../map-style";
import {
  Coord,
  GeoWebCoordinate,
  coordToFeature,
  GW_MAX_LAT,
  GW_MAX_LON,
} from "../Map";

type CellHoverSourceProps = {
  geoWebCoordinate: GeoWebCoordinate;
  cellHoverCoord: Coord | null;
};

function CellHoverSource(props: CellHoverSourceProps) {
  const { geoWebCoordinate, cellHoverCoord } = props;

  const geoJsonFeatures = useMemo(() => {
    const _features = [];

    if (cellHoverCoord) {
      const gwCoord = geoWebCoordinate.make_gw_coord(
        cellHoverCoord.x,
        cellHoverCoord.y
      );
      const coords = geoWebCoordinate.to_gps(gwCoord, GW_MAX_LAT, GW_MAX_LON);

      _features.push(
        coordToFeature(gwCoord, coords, cellHoverCoord.x, cellHoverCoord.y)
      );
    }

    return { _features };
  }, [cellHoverCoord]);

  return (
    <Source
      id="cell-hover-data"
      type="geojson"
      data={{
        type: "FeatureCollection",
        features: geoJsonFeatures._features,
      }}
    >
      <Layer {...cellHoverLayer} />
    </Source>
  );
}

export default CellHoverSource;
