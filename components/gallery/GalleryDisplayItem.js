import * as React from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import { pinCid, unpinCid } from "../../lib/pinning";

const DISPLAY_TYPES = {
  "3DModel": "3D Model",
  ImageObject: "Image",
  VideoObject: "Video",
  AudioObject: "Audio",
};

export function GalleryDisplayItem({
  ipfs,
  mediaGalleryItemStreamManager,
  index,
  pinningData,
  updatePinningData,
  pinningServiceEndpoint,
  pinningServiceAccessToken,
  selectedMediaGalleryItemId,
  setSelectedMediaGalleryItemId,
}) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isUnpinning, setIsUnpinning] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const isEditing = selectedMediaGalleryItemId
    ? selectedMediaGalleryItemId.toString() ==
      mediaGalleryItemStreamManager.getStreamId().toString()
    : false;

  const shouldHighlight = !isRemoving && (isHovered || isEditing);

  const data = mediaGalleryItemStreamManager.getStreamContent();
  const cid = data.contentUrl.replace("ipfs://", "");
  const pinningDataItem = pinningData[cid];
  const pinningStatus = pinningDataItem ? pinningDataItem.status : null;
  const isPinned = pinningStatus == "pinned";
  const isReadyToPin = pinningStatus == null;

  const spinner = (
    <div className="spinner-border" role="status">
      <span className="sr-only"></span>
    </div>
  );

  let pinningStatusView;
  switch (pinningStatus) {
    case "pinned":
      pinningStatusView = <Col className="text-primary">Pinned</Col>;
      break;
    case "queued":
      pinningStatusView = <Col className="text-info">Pinning {spinner}</Col>;
      break;
    case "pinning":
      pinningStatusView = <Col className="text-info">Pinning {spinner}</Col>;
      break;
    case "failed":
      pinningStatusView = <Col className="text-danger">Pinning Failed</Col>;
      break;
    default:
      pinningStatusView = <Col className="text-warning">Not Pinned</Col>;
      break;
  }

  if (isRemoving) {
    pinningStatusView = <Col className="text-info">Removing {spinner}</Col>;
  }

  async function removeMediaGalleryItem() {
    setIsRemoving(true);
    await mediaGalleryItemStreamManager.removeFromMediaGallery();

    await unpinCid(
      pinningData,
      pinningServiceEndpoint,
      pinningServiceAccessToken,
      cid,
      updatePinningData
    );

    setIsRemoving(false);
  }

  async function handlePin() {
    await pinCid(
      ipfs,
      pinningServiceEndpoint,
      pinningServiceAccessToken,
      data.name,
      cid,
      updatePinningData
    );
  }

  async function handleUnpin() {
    setIsUnpinning(true);

    await unpinCid(
      pinningData,
      pinningServiceEndpoint,
      pinningServiceAccessToken,
      cid,
      updatePinningData
    );

    setIsUnpinning(false);
  }

  function handleEdit() {
    setSelectedMediaGalleryItemId(mediaGalleryItemStreamManager.getStreamId());
  }

  return (
    <Container
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`text-center p-3 rounded ${
        shouldHighlight ? "border border-secondary" : ""
      }`}
    >
      <Row>
        <Col>
          <h1 style={{ fontSize: "1.5em" }}>
            {index + 1}. {data.name}
          </h1>
        </Col>
      </Row>
      <Row>
        <Col>
          <Image src="file.png" />
        </Col>
      </Row>
      <Row className="text-center">
        <Col>
          <p>{DISPLAY_TYPES[data["@type"]]}</p>
          <p>{data.encodingFormat}</p>
        </Col>
      </Row>
      <Row className="text-center mb-3">{pinningStatusView}</Row>
      <Row style={{ visibility: shouldHighlight ? "visible" : "hidden" }}>
        {isPinned ? (
          <Col>
            <Button variant="info" onClick={handleUnpin} disabled={isUnpinning}>
              Unpin
            </Button>
          </Col>
        ) : null}
        {isReadyToPin ? (
          <Col>
            <Button variant="info" onClick={handlePin}>
              Pin
            </Button>
          </Col>
        ) : null}
        <Col>
          <Button variant="info" onClick={handleEdit} disabled={isEditing}>
            Edit
          </Button>
        </Col>
        <Col>
          <Button variant="danger" onClick={removeMediaGalleryItem}>
            Delete
          </Button>
        </Col>
      </Row>
    </Container>
  );
}

export default GalleryDisplayItem;
