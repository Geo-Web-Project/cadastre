import * as React from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import GalleryDisplayItem from "./GalleryDisplayItem";

const MOCK_DATA = [
  {
    "@type": "3DModel",
    name: "Beeple Thing",
    contentUri: "ipfs://",
    encodingFormat: "model/gltf-binary",
  },
  {
    "@type": "VideoObject",
    name: "Video Thing",
    contentUri: "ipfs://",
    encodingFormat: "video/mp4",
  },
  {
    "@type": "AudioObject",
    name: "Music2",
    contentUri: "ipfs://",
    encodingFormat: "audio/mp4",
  },
  {
    "@type": "ImageObject",
    name: "ART NFT",
    contentUri: "ipfs://",
    encodingFormat: "image/png",
  },
];

export function GalleryDisplayGrid({
  mediaGalleryData,
  removeMediaGalleryItemAt,
}) {
  let data = mediaGalleryData;

  return (
    <Row className="p-5 m-3" style={{ backgroundColor: "#111320" }}>
      {data.map((item, i) => (
        <Col key={i}>
          <GalleryDisplayItem
            data={item}
            index={i}
            removeMediaGalleryItemAt={removeMediaGalleryItemAt}
          />
        </Col>
      ))}
    </Row>
  );
}

export default GalleryDisplayGrid;