import * as React from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import { GalleryModalProps } from "./GalleryModal";
import { MediaGalleryItemStreamManager } from "../../lib/stream-managers/MediaGalleryItemStreamManager";
import { CID } from "multiformats/cid";

const DISPLAY_TYPES: Record<string, string> = {
  "3DModel": "3D Model",
  ImageObject: "Image",
  VideoObject: "Video",
  AudioObject: "Audio",
};

enum PinState {
  PINNED = 0,
  PINNING = 1,
  FAILED = 2,
  NOT_FOUND = 3,
}

export type GalleryDisplayItemProps = GalleryModalProps & {
  mediaGalleryItemStreamManager: MediaGalleryItemStreamManager;
  index: number;
  selectedMediaGalleryItemId: string | null;
  setSelectedMediaGalleryItemId: React.Dispatch<
    React.SetStateAction<string | null>
  >;
};

function GalleryDisplayItem(props: GalleryDisplayItemProps) {
  const {
    pinningManager,
    ipfs,
    mediaGalleryItemStreamManager,
    index,
    selectedMediaGalleryItemId,
    setSelectedMediaGalleryItemId,
    selectedParcelId,
    setSelectedParcelId,
  } = props;
  const [isHovered, setIsHovered] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [pinState, setPinState] = React.useState<PinState | null>(null);
  const isEditing = selectedMediaGalleryItemId
    ? selectedMediaGalleryItemId.toString() ==
        mediaGalleryItemStreamManager.getStreamId()?.toString() ?? null
    : false;

  const shouldHighlight = !isRemoving && (isHovered || isEditing);

  const data = mediaGalleryItemStreamManager.getStreamContent();
  const cidStr = data?.contentUrl?.replace("ipfs://", "");
  const cid = cidStr ? CID.parse(cidStr) : null;
  const name = cid
    ? `${mediaGalleryItemStreamManager.getStreamId()}-${cid}`
    : null;
  const isPinned = pinningManager && cid ? pinningManager.isPinned(cid) : false;
  const isQueued = pinningManager && cid ? pinningManager.isQueued(cid) : false;
  const failedPins = pinningManager ? pinningManager.failedPins : new Set();

  React.useEffect(() => {
    if (!pinningManager || !name || !cid) {
      return;
    }

    if (isPinned) {
      setPinState(PinState.PINNED);
    } else if (failedPins.has(name)) {
      setPinState(PinState.FAILED);
    } else {
      setPinState(PinState.PINNING);

      // If not queued, trigger pin again
      if (!isQueued) {
        console.log(`Object ${name} is not in queue. Pinning again...`);
        pinningManager.pinCid(name, cid);
      }
    }
  }, [pinningManager, failedPins.size, isPinned, isQueued]);

  const spinner = (
    <span className="spinner-border" role="status">
      <span className="visually-hidden"></span>
    </span>
  );

  let statusView;
  if (isRemoving) {
    statusView = (
      <Col className="text-white">
        <h4>Removing</h4>
        {spinner}
      </Col>
    );
  } else if (pinState == PinState.PINNING) {
    statusView = (
      <Col className="text-white">
        <h4>Pinning</h4>
        {spinner}
      </Col>
    );
  } else if (pinState == PinState.FAILED) {
    statusView = (
      <Col className="text-white mt-4">
        <h4>Pin Failed</h4>
      </Col>
    );
  } else if (pinState == PinState.NOT_FOUND) {
    statusView = (
      <Col className="text-white mt-4">
        <h4>File Not Found</h4>
      </Col>
    );
  }

  async function removeMediaGalleryItem() {
    setIsRemoving(true);
    await mediaGalleryItemStreamManager.removeFromMediaGallery();
    if (name) await pinningManager?.unpinCid(name);
    setIsRemoving(false);

    // Reload parcel
    const oldParcelId = selectedParcelId;
    setSelectedParcelId("");
    setSelectedParcelId(oldParcelId);
  }

  async function retriggerPin() {
    await pinningManager?.retryPin();
  }

  function handleEdit() {
    setSelectedMediaGalleryItemId(
      mediaGalleryItemStreamManager.getStreamId()?.toString() ?? null
    );
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
        <Col style={statusView ? { opacity: "0.3" } : {}}>
          <h1 style={{ fontSize: "1.5em" }}>
            {index + 1}. {data?.name}
          </h1>
        </Col>
      </Row>
      <Row>
        <Col style={{height: "100px"}}>
          <Image style={statusView ? { opacity: "0.3" } : {}} src="file.png" />
          <div
            className="position-relative bottom-100"
          >
            {statusView}
          </div>
        </Col>
      </Row>
      <Row className="text-center" style={statusView ? { opacity: "0.3" } : {}}>
        <Col>
          {data && data["@type"] ? <p>{DISPLAY_TYPES[data["@type"]]}</p> : null}
        </Col>
      </Row>
      {!shouldHighlight && pinState == PinState.PINNING ? (
        <Row>
          <p>Note: You may navigate from this page & pinning will continue.</p>
        </Row>
      ) : null}
      <Row
        style={{
          visibility: shouldHighlight ? "visible" : "hidden",
        }}
      >
        <Col
          className="mb-3"
          xs="12"
          style={{
            display: pinState == PinState.FAILED ? "inline" : "none",
          }}
        >
          <Button variant="secondary" onClick={retriggerPin}>
            Retrigger Pin
          </Button>
        </Col>
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
