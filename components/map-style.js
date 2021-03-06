export const gridLayer = {
  id: "grid-layer",
  type: "fill",
  paint: {
    "fill-color": "#FFFFFF",
    "fill-outline-color": "#000000",
    "fill-opacity": 0.2,
  },
};
export const gridHighlightLayer = {
  id: "grid-highlight-layer",
  type: "fill",
  source: "grid-layer",
  paint: {
    "fill-color": "#FFFFFF",
    "fill-outline-color": "#000000",
    "fill-opacity": 0.5,
  },
};
export function claimLayer(isValid) {
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
export const parcelLayer = {
  id: "parcels-layer",
  type: "fill",
  paint: {
    "fill-color": "#2FC1C1",
    "fill-opacity": 0.5,
  },
};
export const parcelHighlightLayer = {
  id: "parcels-highlight-layer",
  type: "fill",
  paint: {
    "fill-color": "#2FC1C1",
    "fill-opacity": 1.0,
  },
};
