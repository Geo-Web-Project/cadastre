import * as React from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import { IPFS_API_ENDPOINT, PINATA_API_ENDPOINT } from "../../lib/constants";
import { pinCid } from "../../lib/pinning";

const ipfsClient = require("ipfs-http-client");

export function GalleryForm({
  addMediaGalleryItem,
  updatePinningData,
  pinningServiceEndpoint,
  pinningServiceAccessToken,
  setPinningServiceEndpoint,
  setPinningServiceAccessToken,
}) {
  const ipfs = ipfsClient(IPFS_API_ENDPOINT);

  const [pinningService, setPinningService] = React.useState("pinata");

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
    setPinningService("pinata");
    setPinningServiceEndpoint(PINATA_API_ENDPOINT);
  }

  function addToGallery() {
    if (mediaGalleryItem) {
      addMediaGalleryItem(mediaGalleryItem);
    }

    clearForm();

    // Asyncronously add pin
    pinCid(
      ipfs,
      pinningServiceEndpoint,
      pinningServiceAccessToken,
      mediaGalleryItem.name,
      mediaGalleryItem.contentUri.replace("ipfs://", ""),
      updatePinningData
    );
  }

  function onSelectPinningService(event) {
    setPinningService(event.target.value);

    if (event.target.value != "pinata") {
      setPinningServiceEndpoint("");
    } else {
      setPinningServiceEndpoint(PINATA_API_ENDPOINT);
    }

    setPinningServiceAccessToken("");
  }

  let isReadyToAdd =
    mediaGalleryItem.contentUri &&
    mediaGalleryItem.name &&
    pinningServiceEndpoint &&
    pinningServiceAccessToken;

  return (
    <>
      <Form id="galleryForm" className="pt-3">
        <Row className="px-3">
          <Col sm="12" lg="6" className="mb-3">
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
          <Col sm="12" lg="6" className="mb-3">
            <div key="inline-radio">
              <Form.Check
                inline
                checked
                readOnly
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
        <Row className="px-3">
          <Col sm="12" lg="6" className="mb-3">
            <Form.Control
              style={{ backgroundColor: "#111320", border: "none" }}
              className="text-white"
              type="text"
              placeholder="Display Name of Media"
              required
              onChange={(e) => {
                updateMediaGalleryItem({
                  name: e.target.value,
                });
              }}
            />
          </Col>
          <Col sm="12" lg="6" className="mb-3">
            <Form.Control
              as="select"
              className="text-white"
              style={{ backgroundColor: "#111320", border: "none" }}
              onChange={onSelectPinningService}
              custom
            >
              <option value="pinata">
                Pinata Pinning Service (Requires Credentials)
              </option>
              <option value="custom">Custom Pinning Service</option>
            </Form.Control>
          </Col>
        </Row>
        <Row className="px-3">
          <Col sm="12" lg="6" className="mb-3">
            <Form.Control
              style={{ backgroundColor: "#111320", border: "none" }}
              className="text-white"
              type="text"
              placeholder="Pinning Service API Endpoint"
              value={pinningServiceEndpoint}
              readOnly={pinningService == "pinata"}
              onChange={(e) => {
                setPinningServiceEndpoint(e.target.value);
              }}
            />
          </Col>
          <Col sm="12" lg="6" className="mb-3">
            <Form.Control
              style={{ backgroundColor: "#111320", border: "none" }}
              className="text-white"
              type="text"
              placeholder="JWT Access Token"
              value={pinningServiceAccessToken}
              onChange={(e) => {
                setPinningServiceAccessToken(e.target.value);
              }}
            />
          </Col>
          <Col
            className="mb-3"
            style={{
              visibility: pinningService == "pinata" ? "visible" : "hidden",
            }}
          >
            <a
              href="https://pinata.cloud/documentation#PinningServicesAPI"
              target="_blank"
              rel="noreferrer"
              className="text-light"
            >
              <i>See Pinata’s documentation for details on configuration.</i>
            </a>
          </Col>
        </Row>
        <Row className="px-3 text-right">
          <Col xs="auto" lg={{ offset: 6 }} className="mb-3">
            <Button variant="danger" onClick={clearForm}>
              Cancel
            </Button>
          </Col>
          <Col xs="auto">
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
