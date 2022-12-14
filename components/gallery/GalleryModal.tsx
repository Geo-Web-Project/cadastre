import * as React from "react";
import Modal from "react-bootstrap/Modal";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Container from "react-bootstrap/Container";
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

  const { mediaGalleryItems, setShouldMediaGalleryUpdate } = useMediaGallery(
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
                mediaGalleryItems={mediaGalleryItems}
                selectedMediaGalleryItemIndex={selectedMediaGalleryItemIndex}
                setSelectedMediaGalleryItemIndex={
                  setSelectedMediaGalleryItemIndex
                }
                setShouldMediaGalleryUpdate={setShouldMediaGalleryUpdate}
                {...props}
              />
              <GalleryDisplayGrid
                mediaGalleryItems={mediaGalleryItems}
                selectedMediaGalleryItemIndex={selectedMediaGalleryItemIndex}
                setSelectedMediaGalleryItemIndex={
                  setSelectedMediaGalleryItemIndex
                }
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
