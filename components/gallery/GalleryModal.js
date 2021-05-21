import * as React from "react";
import Modal from "react-bootstrap/Modal";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Container from "react-bootstrap/Container";
import GalleryForm from "./GalleryForm";
import GalleryDisplayGrid from "./GalleryDisplayGrid";
import { STATE_PARCEL_SELECTED } from "../Map";
import {
  PINATA_API_ENDPOINT,
  MEDIA_GALLERY_ITEM_SCHEMA_DOCID,
  MEDIA_GALLERY_SCHEMA_DOCID,
} from "../../lib/constants";
import { useMediaGalleryStreamManager } from "../../lib/stream-managers/MediaGalleryStreamManager";
import { useMediaGalleryItemData } from "../../lib/stream-managers/MediaGalleryItemStreamManager";
import { usePinningManager } from "../../lib/PinningManager";

export function GalleryModal({
  show,
  setInteractionState,
  parcelRootStreamManager,
  ipfs,
  ceramic,
}) {
  const handleClose = () => {
    setInteractionState(STATE_PARCEL_SELECTED);
  };

  const mediaGalleryStreamManager = useMediaGalleryStreamManager(
    parcelRootStreamManager
  );
  const { mediaGalleryData, mediaGalleryItems } = useMediaGalleryItemData(
    mediaGalleryStreamManager
  );
  const [selectedMediaGalleryItemId, setSelectedMediaGalleryItemId] =
    React.useState(null);
  const [selectedMediaGalleryItemManager, setSelectedMediaGalleryItemManager] =
    React.useState(null);

  const spinner = (
    <div className="spinner-border" role="status">
      <span className="sr-only">Loading...</span>
    </div>
  );

  // Only update when ID changes
  React.useEffect(() => {
    const _selectedMediaGalleryItemManager =
      mediaGalleryItems && selectedMediaGalleryItemId
        ? mediaGalleryItems[selectedMediaGalleryItemId]
        : null;
    setSelectedMediaGalleryItemManager(_selectedMediaGalleryItemManager);
  }, [selectedMediaGalleryItemId]);

  const pinningManager = usePinningManager(ceramic, ipfs);
  const [storageLink, setStorageLink] = React.useState(null);
  const [storageUsed, setStorageUsed] = React.useState(null);
  const storageCapacity = pinningManager
    ? pinningManager.getStorageLimit()
    : null;

  let storageDisplayStr;
  if (storageUsed && storageCapacity) {
    // storageDisplayStr = `${(storageUsed / 1000000).toFixed(1)} MB of ${(
    //   storageCapacity / 1000000
    // ).toFixed(1)} MB Used`;
    storageDisplayStr = `${(storageUsed / 1000000).toFixed(1)} MB Used`;
  } else {
    storageDisplayStr = <>{spinner} MB Used</>;
  }

  React.useEffect(() => {
    if (!pinningManager) {
      return;
    }

    async function _update() {
      const _storageLink = await pinningManager.getLink();
      setStorageLink(_storageLink);

      const _storageUsed = await pinningManager.getStorageUsed();
      setStorageUsed(_storageUsed);

      await pinningManager.archive();
    }

    _update();
  }, [pinningManager, mediaGalleryItems]);

  const isLoading =
    mediaGalleryStreamManager == null ||
    pinningManager == null ||
    storageLink == null;

  return (
    <Modal
      show={show}
      backdrop="static"
      keyboard={false}
      centered
      size="xl"
      onHide={handleClose}
    >
      <Modal.Header className="bg-dark border-0">
        <Container>
          <Row>
            <Col sm="11">
              <Modal.Title className="text-primary">
                Edit Media Gallery
              </Modal.Title>
            </Col>
            <Col sm="1" className="text-right">
              <Button variant="link" size="sm" onClick={handleClose}>
                <Image src="close.svg" />
              </Button>
            </Col>
          </Row>
        </Container>
      </Modal.Header>
      {isLoading ? (
        <Modal.Body className="bg-dark p-5 text-light text-center">
          {pinningManager == null ? (
            <p>Provisioning Storage For Media Gallery</p>
          ) : null}
          {spinner}
        </Modal.Body>
      ) : (
        <>
          <Modal.Body className="bg-dark px-4 text-light">
            <p>
              Add content to this structured gallery for easy display on the{" "}
              <a>Geo Web Spatial Browser.</a>
            </p>
            <div className="border border-secondary rounded p-3 text-center">
              <GalleryForm
                pinningManager={pinningManager}
                ipfs={ipfs}
                mediaGalleryStreamManager={mediaGalleryStreamManager}
                selectedMediaGalleryItemManager={
                  selectedMediaGalleryItemManager
                }
                setSelectedMediaGalleryItemId={setSelectedMediaGalleryItemId}
              />
              <GalleryDisplayGrid
                pinningManager={pinningManager}
                mediaGalleryData={mediaGalleryData}
                mediaGalleryItems={mediaGalleryItems}
                selectedMediaGalleryItemId={selectedMediaGalleryItemId}
                setSelectedMediaGalleryItemId={setSelectedMediaGalleryItemId}
              />
              <a
                className="text-light"
                href={storageLink}
                target="_blank"
                rel="noreferrer"
              >
                {storageDisplayStr}
              </a>
            </div>
          </Modal.Body>
        </>
      )}
    </Modal>
  );
}

export default GalleryModal;
