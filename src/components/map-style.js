export const gridLayer = {
  id: "grid-layer",
  type: "fill",
  paint: {
    "fill-color": "#FFFFFF",
    "fill-outline-color": "#000000",
    "fill-opacity": 0.1,
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
export const claimLayer = {
  id: "claim-layer",
  type: "fill",
  source: "grid-layer",
  paint: {
    "fill-color": "#FAFF00",
    "fill-opacity": 0.75,
  },
};
export const parcelLayer = {
  id: "parcels-layer",
  type: "fill",
  paint: {
    "fill-color": "#E11515",
    "fill-opacity": 0.5,
  },
};
export const parcelHighlightLayer = {
  id: "parcels-highlight-layer",
  type: "fill",
  paint: {
    "fill-color": "#E11515",
    "fill-opacity": 1.0,
  },
};
