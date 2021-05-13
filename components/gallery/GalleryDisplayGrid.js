import * as React from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import GalleryDisplayItem from "./GalleryDisplayItem";

export function GalleryDisplayGrid({
  mediaGalleryData,
  mediaGalleryItems,
  pinningData,
  updatePinningData,
  pinningServiceEndpoint,
  pinningServiceAccessToken,
  ipfs,
  selectedMediaGalleryItemId,
  setSelectedMediaGalleryItemId,
}) {
  const data = mediaGalleryData
    .flatMap((docId) => mediaGalleryItems[docId])
    .filter((v) => v);

  return (
    <Row className="p-5 m-3 text-center" style={{ backgroundColor: "#111320" }}>
      {data.map((mediaGalleryItemStreamManager, i) => (
        <Col key={i} xs="12" lg="6" xl="4">
          <GalleryDisplayItem
            ipfs={ipfs}
            mediaGalleryItemStreamManager={mediaGalleryItemStreamManager}
            index={i}
            pinningData={pinningData}
            updatePinningData={updatePinningData}
            pinningServiceEndpoint={pinningServiceEndpoint}
            pinningServiceAccessToken={pinningServiceAccessToken}
            selectedMediaGalleryItemId={selectedMediaGalleryItemId}
            setSelectedMediaGalleryItemId={setSelectedMediaGalleryItemId}
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
