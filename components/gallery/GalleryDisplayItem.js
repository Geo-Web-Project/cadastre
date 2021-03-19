import * as React from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";

const DISPLAY_TYPES = {
  "3DModel": "3D Model",
  ImageObject: "Image",
  VideoObject: "Video",
  AudioObject: "Audio",
};

export function GalleryDisplayItem({ data }) {
  return (
    <div>
      <h1 style={{ fontSize: "1.5em" }}>{data.name}</h1>
      <p>{DISPLAY_TYPES[data["@type"]]}</p>
    </div>
  );
}

export default GalleryDisplayItem;
