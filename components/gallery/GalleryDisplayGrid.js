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
  pinningData,
  updatePinningData,
  pinningServiceEndpoint,
  pinningServiceAccessToken,
}) {
  let data = mediaGalleryData;

  return (
    <Row className="p-5 m-3 text-center" style={{ backgroundColor: "#111320" }}>
      {data.map((item, i) => (
        <Col key={i} xs="12" lg="6" xl="4">
          <GalleryDisplayItem
            data={item}
            index={i}
            removeMediaGalleryItemAt={removeMediaGalleryItemAt}
            pinningData={pinningData}
            updatePinningData={updatePinningData}
            pinningServiceEndpoint={pinningServiceEndpoint}
            pinningServiceAccessToken={pinningServiceAccessToken}
          />
        </Col>
      ))}
      {data.length == 0 ? (
        <Col xs="12" className="text-muted">
          No items in gallery
        </Col>
      ) : null}
    </Row>
  );
}

export default GalleryDisplayGrid;
