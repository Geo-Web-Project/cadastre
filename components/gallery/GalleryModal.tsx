import * as React from "react";
import { BigNumber } from "ethers";
import Modal from "react-bootstrap/Modal";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Container from "react-bootstrap/Container";
import type { IPCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/IPCOLicenseDiamond";
import { GeoWebContent } from "@geo-web/content";
import GalleryForm from "./GalleryForm";
import GalleryDisplayGrid from "./GalleryDisplayGrid";
import { STATE } from "../Map";
import { ParcelInfoProps } from "../cards/ParcelInfo";
import { useMediaGallery } from "../../lib/geo-web-content/mediaGallery";

export type GalleryModalProps = ParcelInfoProps & {
  show: boolean;
  geoWebContent: GeoWebContent | null;
  setRootCid: React.Dispatch<React.SetStateAction<string | null>>;
  licenseDiamondContract: IPCOLicenseDiamond | null;
  existingForSalePrice: BigNumber | null;
};

function GalleryModal(props: GalleryModalProps) {
  const {
    geoWebContent,
    ceramic,
    licenseAddress,
    selectedParcelId,
    show,
    setInteractionState,
    setRootCid,
  } = props;
  const handleClose = () => {
    setInteractionState(STATE.PARCEL_SELECTED);
  };

  const {
    mediaGalleryItems,
    shouldMediaGalleryUpdate,
    setShouldMediaGalleryUpdate,
  } = useMediaGallery(
    geoWebContent,
    ceramic,
    licenseAddress,
    selectedParcelId,
    setRootCid
  );

  const [selectedMediaGalleryItemIndex, setSelectedMediaGalleryItemIndex] =
    React.useState<number | null>(null);

  const spinner = (
    <span className="spinner-border" role="status">
      <span className="visually-hidden">Loading...</span>
    </span>
  );

  const isLoading = mediaGalleryItems == null;

  return (
    <Modal
      show={show}
      backdrop="static"
      centered
      scrollable
      keyboard={false}
      size="xl"
      onHide={handleClose}
      contentClassName="bg-dark"
    >
      <Modal.Header className="p-2 p-sm-3 bg-dark border-0">
        <Container className="p-2 p-sm-3">
          <Row>
            <Col xs="8" sm="11">
              <Modal.Title className="text-primary">
                Edit Media Gallery
              </Modal.Title>
            </Col>
            <Col xs="4" sm="1" className="text-end">
              <Button variant="link" size="sm" onClick={handleClose}>
                <Image src="close.svg" />
              </Button>
            </Col>
          </Row>
        </Container>
      </Modal.Header>
      {isLoading ? (
        <Modal.Body className="bg-dark p-5 text-light text-center">
          {spinner}
        </Modal.Body>
      ) : (
        <>
          <Modal.Body className="bg-dark px-3 px-sm-4 text-light">
            <p>
              The Media Gallery is a simple carousel viewing experience on the{" "}
              <a href="https://geoweb.app" target="_blank" rel="noreferrer">
                spatial browser
              </a>
              . GLB and USDZ (iOS only) files can be viewed in AR on compatible
              devices.
            </p>
            <div className="border border-secondary rounded p-2 p-sm-3 text-center">
              <GalleryForm
                mediaGalleryItems={mediaGalleryItems}
                selectedMediaGalleryItemIndex={selectedMediaGalleryItemIndex}
                setSelectedMediaGalleryItemIndex={
                  setSelectedMediaGalleryItemIndex
                }
                shouldMediaGalleryUpdate={shouldMediaGalleryUpdate}
                setShouldMediaGalleryUpdate={setShouldMediaGalleryUpdate}
                {...props}
              />
              <GalleryDisplayGrid
                mediaGalleryItems={mediaGalleryItems}
                selectedMediaGalleryItemIndex={selectedMediaGalleryItemIndex}
                setSelectedMediaGalleryItemIndex={
                  setSelectedMediaGalleryItemIndex
                }
                shouldMediaGalleryUpdate={shouldMediaGalleryUpdate}
                setShouldMediaGalleryUpdate={setShouldMediaGalleryUpdate}
                {...props}
              />
            </div>
          </Modal.Body>
        </>
      )}
    </Modal>
  );
}

export default GalleryModal;
