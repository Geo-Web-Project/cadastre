// eslint-disable-next-line import/named
import { LayerProps } from "react-map-gl";

export const gridLayer: LayerProps = {
  id: "grid-layer",
  type: "fill",
  paint: {
    "fill-color": "#FFFFFF",
    "fill-outline-color": "#000000",
    "fill-opacity": 0.2,
  },
};
export const gridHighlightLayer: LayerProps = {
  id: "grid-highlight-layer",
  type: "fill",
  source: "grid-layer",
  paint: {
    "fill-color": "#FFFFFF",
    "fill-outline-color": "#000000",
    "fill-opacity": 0.5,
  },
};
export function claimLayer(isValid: boolean): LayerProps {
  return {
    id: "claim-layer",
    type: "fill",
    source: "grid-layer",
    paint: {
      "fill-color": isValid ? "#FAFF00" : "#E11515",
      "fill-opacity": 0.75,
    },
  };
}
export const cellHoverLayer: LayerProps = {
  id: "cell-hover-layer",
  type: "fill",
  paint: {
    "fill-color": "#FFF",
    "fill-opacity": 0.75,
  },
};
export const parcelLayer: LayerProps = {
  id: "parcels-layer",
  type: "fill",
  paint: {
    "fill-color": "#2FC1C1",
    "fill-opacity": 0.5,
    "fill-outline-color": "#000000",
  },
};
export function parcelHighlightLayer(
  parcelHoverId: string,
  selectedParcelId: string
): LayerProps {
  return {
    id: "parcels-highlight-layer",
    type: "fill",
    paint: {
      "fill-color": "#2FC1C1",
      "fill-opacity": 0.75,
      "fill-outline-color": "#000000",
    },
    filter: [
      "any",
      ["==", "parcelId", parcelHoverId],
      ["==", "parcelId", selectedParcelId],
    ],
  };
}
export function parcelInvalidLayer(selectedParcelId: string): LayerProps {
  return {
    id: "parcels-invalid-layer",
    type: "fill",
    paint: {
      "fill-color": "#E11515",
      "fill-opacity": 0.75,
    },
    filter: ["==", "parcelId", selectedParcelId],
  };
}
