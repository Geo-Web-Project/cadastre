import * as React from "react";
import Modal from "react-bootstrap/Modal";

import { STATE_PARCEL_SELECTED } from "../Map";

export function GalleryModal({ show, setInteractionState }) {
  const handleClose = () => {
    setInteractionState(STATE_PARCEL_SELECTED);
  };

  return (
    <Modal
      show={show}
      backdrop="static"
      keyboard={false}
      centered
      size="xl"
      onHide={handleClose}
    >
      <Modal.Header className="bg-dark" closeButton={true}>
        <Modal.Title className="text-primary">Edit Media Gallery</Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-dark px-4 text-light">
        <p>
          Upload, pin, and link media in this structured media gallery template
          for easy Geo Web publishing and browsing.
        </p>
      </Modal.Body>
    </Modal>
  );
}

export default GalleryModal;
