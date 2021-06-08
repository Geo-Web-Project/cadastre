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

export const videoInstruction = {
  position: "absolute",
  width: "560px",
  height: "350px",
  left: "135px",
  top: "204px",

  background: "#C4C4C4"
};

export const landingContent = {
  position: "absolute",
  width: "978px",
  height: "956px",
  left: "135px",
  top: "589px",

  //fontFamily: "VT323",
  fontStyle: "normal",
  fontWeight: "normal",
  fontSize: "28px",
  lineHeight: "45px",
  /* or 161% */

  color: "#FFFFFF",
};

export const walletPrompt = {
  position: "absolute",
  width: "400px",
  height: "1119px",
  left: "1135px",
  top: "157px",

  /* Dark Blue */

  background: "#202333",
};