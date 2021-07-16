import * as React from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";

const DISPLAY_TYPES = {
  "3DModel": "3D Model",
  ImageObject: "Image",
  VideoObject: "Video",
  AudioObject: "Audio",
};

const STATE_PINNED = 0;
const STATE_PINNING = 1;
const STATE_FAILED = 2;
const STATE_NOT_FOUND = 3;

export function GalleryDisplayItem({
  pinningManager,
  mediaGalleryItemStreamManager,
  index,
  selectedMediaGalleryItemId,
  setSelectedMediaGalleryItemId,
}) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [pinState, setPinState] = React.useState(null);
  const isEditing = selectedMediaGalleryItemId
    ? selectedMediaGalleryItemId.toString() ==
      mediaGalleryItemStreamManager.getStreamId().toString()
    : false;

  const shouldHighlight = !isRemoving && (isHovered || isEditing);

  const data = mediaGalleryItemStreamManager.getStreamContent();
  const cid = data.contentUrl.replace("ipfs://", "");
  const name = `${mediaGalleryItemStreamManager.getStreamId()}-${cid}`;

  React.useEffect(() => {
    if (!pinningManager) {
      return;
    }

    if (pinningManager.isPinned(name)) {
      setPinState(STATE_PINNED);
    } else {
      setPinState(STATE_PINNING);
    }
  }, [pinningManager]);

  // Trigger preload
  React.useEffect(() => {
    async function triggerPreload() {
      try {
        await pinningManager._ipfs.preload(cid);
      } catch (err) {
        console.error(err);
        setPinState(STATE_NOT_FOUND);
      }
    }

    if (pinState == STATE_PINNING) {
      triggerPreload();
    }
  }, [pinState]);

  const spinner = (
    <div className="spinner-border" role="status">
      <span className="sr-only"></span>
    </div>
  );

  let statusView;
  if (isRemoving) {
    statusView = <Col className="text-info">Removing {spinner}</Col>;
  } else if (pinState == STATE_PINNING) {
    statusView = <Col className="text-info">Pinning {spinner}</Col>;
  } else if (pinState == STATE_FAILED) {
    statusView = <Col className="text-danger">Pin Failed</Col>;
  } else if (pinState == STATE_NOT_FOUND) {
    statusView = <Col className="text-danger">File Not Found</Col>;
  }

  async function removeMediaGalleryItem() {
    setIsRemoving(true);
    await mediaGalleryItemStreamManager.removeFromMediaGallery();
    await pinningManager.unpinCid(name);
    setIsRemoving(false);
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
        </Col>
      </Row>
      <Row className="text-center mb-3">{statusView}</Row>
      <Row
        style={{
          visibility: shouldHighlight ? "visible" : "hidden",
        }}
      >
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
        <Col
          style={{
            display: pinState == STATE_FAILED ? "inline" : "none",
          }}
        >
          <Button variant="secondary" onClick={removeMediaGalleryItem}>
            Retrigger Pin
          </Button>
        </Col>
      </Row>
    </Container>
  );
}

export default GalleryDisplayItem;
