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

export function GalleryModal({ show, setInteractionState }) {
  const handleClose = () => {
    setInteractionState(STATE_PARCEL_SELECTED);
  };

  const [mediaGalleryData, setMediaGalleryData] = React.useState([]);
  function addMediaGalleryItem(item) {
    function _addItem(item) {
      return (prevState) => {
        return prevState.concat(item);
      };
    }

    setMediaGalleryData(_addItem(item));
  }

  function removeMediaGalleryItemAt(index) {
    function _removeAt(index) {
      return (prevState) => {
        return prevState.splice(index + 1, 1);
      };
    }

    setMediaGalleryData(_removeAt(index));
  }

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
            <Col sm="1">
              <Button variant="link" size="sm" onClick={handleClose}>
                <Image src="close.svg" />
              </Button>
            </Col>
          </Row>
        </Container>
      </Modal.Header>
      <Modal.Body className="bg-dark px-4 text-light">
        <p>
          Upload, pin, and link media in this structured media gallery template
          for easy Geo Web publishing and browsing.
        </p>
        <div className="border border-secondary rounded p-3">
          <GalleryForm addMediaGalleryItem={addMediaGalleryItem} />
          <GalleryDisplayGrid
            mediaGalleryData={mediaGalleryData}
            removeMediaGalleryItemAt={removeMediaGalleryItemAt}
          />
        </div>
      </Modal.Body>
    </Modal>
  );
}

export default GalleryModal;