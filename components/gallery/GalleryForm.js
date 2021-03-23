import * as React from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import { IPFS_API_ENDPOINT } from "../../lib/constants";

const ipfsClient = require("ipfs-http-client");

export function GalleryForm({ addMediaGalleryItem }) {
  const ipfs = ipfsClient(IPFS_API_ENDPOINT);

  const [mediaGalleryItem, setMediaGalleryItem] = React.useState({});
  function updateMediaGalleryItem(updatedValues) {
    function _updateData(updatedValues) {
      return (prevState) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setMediaGalleryItem(_updateData(updatedValues));
  }

  async function captureFile(event) {
    event.stopPropagation();
    event.preventDefault();

    const file = event.target.files[0];

    let format;
    if (file.name.endsWith(".glb")) {
      format = "model/gltf-binary";
    } else if (file.name.endsWith(".usdz")) {
      format = "model/vnd.usdz+zip";
    }

    const added = await ipfs.add(file);

    updateMediaGalleryItem({
      "@type": "3DModel",
      contentUri: `ipfs://${added.cid.toV1().toBaseEncodedString("base32")}`,
      encodingFormat: format,
    });
  }

  function clearForm() {
    document.getElementById("galleryForm").reset();

    setMediaGalleryItem({});
  }

  function addToGallery() {
    if (mediaGalleryItem) {
      addMediaGalleryItem(mediaGalleryItem);
    }

    clearForm();
  }

  let isReadyToAdd = mediaGalleryItem.contentUri && mediaGalleryItem.name;

  return (
    <>
      <Form id="galleryForm">
        <Row className="p-3">
          <Col sm="12" md="6">
            <Form.File
              id="uploadCid"
              label={
                mediaGalleryItem.contentUri
                  ? mediaGalleryItem.contentUri.replace("ipfs://", "")
                  : "Upload media or add an existing CID"
              }
              style={{ backgroundColor: "#111320", border: "none" }}
              onChange={captureFile}
              accept=".glb, .usdz"
              custom
            />
          </Col>
          <Col sm="12" md="6">
            <div key="inline-radio" className="mb-3">
              <Form.Check
                inline
                checked
                label="AR/VR (.glb or .usdz)"
                type="radio"
                id="inline-radio-1"
              />
              <Form.Check
                inline
                label="Image"
                type="radio"
                id="inline-radio-2"
                disabled
              />
              <Form.Check
                inline
                label="Video"
                type="radio"
                id="inline-radio-3"
                disabled
              />
              <Form.Check
                inline
                label="Audio"
                type="radio"
                id="inline-radio-4"
                disabled
              />
            </div>
          </Col>
        </Row>
        <Row className="p-3">
          <Col sm="12" md="6">
            <Form.Control
              style={{ backgroundColor: "#111320", border: "none" }}
              className="text-white"
              type="text"
              placeholder="Display Name of Media"
              onChange={(e) => {
                updateMediaGalleryItem({
                  name: e.target.value,
                });
              }}
            />
          </Col>
          <Col sm="12" md="6">
            <Form.Control
              as="select"
              className="text-white"
              style={{ backgroundColor: "#111320", border: "none" }}
              custom
            >
              <option>Pinata Pinning Service (Requires Credentials)</option>
              <option>Custom Pinning Service</option>
            </Form.Control>
          </Col>
        </Row>
        <Row className="p-3">
          <Col sm="12" md="6">
            <Form.Control
              style={{ backgroundColor: "#111320", border: "none" }}
              className="text-white"
              type="text"
              placeholder="Pinning Service API Endpoint"
            />
          </Col>
          <Col sm="12" md="6">
            <Form.Control
              style={{ backgroundColor: "#111320", border: "none" }}
              className="text-white"
              type="text"
              placeholder="JWT Access Token"
            />
          </Col>
        </Row>
        <Row className="p-3">
          <Col sm="1">
            <Button variant="danger" onClick={clearForm}>
              Cancel
            </Button>
          </Col>
          <Col sm="2">
            <Button
              variant="secondary"
              disabled={!isReadyToAdd}
              onClick={addToGallery}
            >
              Add to Gallery
            </Button>
          </Col>
        </Row>
      </Form>
    </>
  );
}

export default GalleryForm;
