import * as React from "react";
import Modal from "react-bootstrap/Modal";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Container from "react-bootstrap/Container";
import GalleryForm from "./GalleryForm";
import GalleryDisplayGrid from "./GalleryDisplayGrid";
import { STATE } from "../Map";
import { useMediaGalleryStreamManager } from "../../lib/stream-managers/MediaGalleryStreamManager";
import {
  MediaGalleryItemStreamManager,
  useMediaGalleryItemData,
} from "../../lib/stream-managers/MediaGalleryItemStreamManager";
import { ParcelInfoProps } from "../cards/ParcelInfo";
import { AssetContentManager } from "../../lib/AssetContentManager";
import { PinningManager } from "../../lib/PinningManager";

export type GalleryModalProps = ParcelInfoProps & {
  show: boolean;
  assetContentManager: AssetContentManager | null;
  pinningManager: PinningManager | null;
};

function GalleryModal(props: GalleryModalProps) {
  const { show, setInteractionState, assetContentManager, pinningManager } =
    props;
  const handleClose = () => {
    setInteractionState(STATE.PARCEL_SELECTED);
  };

  const mediaGalleryStreamManager =
    useMediaGalleryStreamManager(assetContentManager);
  const { mediaGalleryData, mediaGalleryItems } = useMediaGalleryItemData(
    mediaGalleryStreamManager,
    assetContentManager
  );
  const [selectedMediaGalleryItemId, setSelectedMediaGalleryItemId] =
    React.useState<string | null>(null);
  const [selectedMediaGalleryItemManager, setSelectedMediaGalleryItemManager] =
    React.useState<MediaGalleryItemStreamManager | null>(null);

  const spinner = (
    <span className="spinner-border" role="status">
      <span className="visually-hidden">Loading...</span>
    </span>
  );

  // Only update when ID changes
  React.useEffect(() => {
    const _selectedMediaGalleryItemManager =
      mediaGalleryItems && selectedMediaGalleryItemId
        ? mediaGalleryItems[selectedMediaGalleryItemId]
        : null;
    setSelectedMediaGalleryItemManager(_selectedMediaGalleryItemManager);
  }, [selectedMediaGalleryItemId]);

  const [storageLink, setStorageLink] = React.useState<string | null>(null);
  const [storageUsed, setStorageUsed] = React.useState<number | null>(null);
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
    async function _update() {
      if (!pinningManager) {
        return;
      }

      const _storageLink = await pinningManager.getLink();
      setStorageLink(_storageLink);

      const _storageUsed = (await pinningManager.getStorageUsed()) ?? null;
      setStorageUsed(_storageUsed);
    }

    _update();
  }, [pinningManager, mediaGalleryItems]);

  const isLoading =
    mediaGalleryStreamManager == null ||
    pinningManager == null ||
    storageLink == null;

  const [isResetting, setIsResetting] = React.useState(false);

  const handleResetPinset = async () => {
    setIsResetting(true);
    await pinningManager?.reset();
    setIsResetting(false);
    handleClose();
  };

  const pinsetNotFoundModal = (
    <Modal.Body className="bg-dark p-5 text-light text-center">
      <p className="px-5">
        The pinset associated to your DID could not be found. If you have
        constrained connectivity, please refresh this page and try again.
      </p>
      <p className="px-5 mb-5">
        If you keep getting this message, your pinset may have been corrupted or
        lost (the Geo Web is a beta product). Please reset your pinset below and
        re-add your desired content.
      </p>
      <Button
        size="lg"
        onClick={handleResetPinset}
        variant="danger"
        disabled={isResetting}
      >
        {isResetting ? spinner : "Reset Pinset"}
      </Button>
    </Modal.Body>
  );

  return (
    <Modal
      show={show}
      backdrop="static"
      keyboard={false}
      centered
      size="xl"
      onHide={handleClose}
      contentClassName="bg-dark"
    >
      <Modal.Header className="bg-dark border-0">
        <Container>
          <Row>
            <Col sm="11">
              <Modal.Title className="text-primary">
                Edit Media Gallery
              </Modal.Title>
            </Col>
            <Col sm="1" className="text-end">
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
      ) : pinningManager.latestQueuedLinks() == null ? (
        pinsetNotFoundModal
      ) : (
        <>
          <Modal.Body className="bg-dark px-4 text-light">
            <p>
              Add content to this structured gallery for easy display on the{" "}
              <a>Geo Web Spatial Browser.</a>
            </p>
            <div className="border border-secondary rounded p-3 text-center">
              <GalleryForm
                mediaGalleryStreamManager={mediaGalleryStreamManager}
                selectedMediaGalleryItemManager={
                  selectedMediaGalleryItemManager
                }
                setSelectedMediaGalleryItemId={setSelectedMediaGalleryItemId}
                {...props}
              />
              <GalleryDisplayGrid
                mediaGalleryData={mediaGalleryData}
                mediaGalleryItems={mediaGalleryItems}
                selectedMediaGalleryItemId={selectedMediaGalleryItemId}
                setSelectedMediaGalleryItemId={setSelectedMediaGalleryItemId}
                {...props}
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
