import * as React from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import InputGroup from "react-bootstrap/InputGroup";
import FormFile from "react-bootstrap/FormFile";
import { PINATA_API_ENDPOINT } from "../../lib/constants";
import { pinCid } from "../../lib/pinning";

export function GalleryForm({
  ipfs,
  addMediaGalleryItem,
  updatePinningData,
  pinningServiceEndpoint,
  pinningServiceAccessToken,
  setPinningServiceEndpoint,
  setPinningServiceAccessToken,
}) {
  const [pinningService, setPinningService] = React.useState("pinata");
  const [isUploading, setIsUploading] = React.useState(false);

  const [mediaGalleryItem, setMediaGalleryItem] = React.useState({});
  const cid = mediaGalleryItem.contentUrl
    ? mediaGalleryItem.contentUrl.replace("ipfs://", "")
    : "";

  function updateMediaGalleryItem(updatedValues) {
    function _updateData(updatedValues) {
      return (prevState) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setMediaGalleryItem(_updateData(updatedValues));
  }

  async function captureFile(event) {
    setIsUploading(true);

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
      contentUrl: `ipfs://${added.cid.toV1().toBaseEncodedString("base32")}`,
      encodingFormat: format,
    });

    setIsUploading(false);
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
      mediaGalleryItem.contentUrl.replace("ipfs://", ""),
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
    mediaGalleryItem.contentUrl &&
    mediaGalleryItem.name &&
    pinningServiceEndpoint &&
    pinningServiceAccessToken;

  const spinner = (
    <div
      className="spinner-border"
      role="status"
      style={{ height: "1.5em", width: "1.5em" }}
    >
      <span className="sr-only"></span>
    </div>
  );

  return (
    <>
      <Form id="galleryForm" className="pt-3">
        <Row className="px-3">
          <Col sm="12" lg="6" className="mb-3">
            <InputGroup>
              <Form.Control
                style={{ backgroundColor: "#111320", border: "none" }}
                className="text-white"
                type="text"
                placeholder="Upload media or add an existing CID"
                readOnly={isUploading}
                value={cid}
                onChange={(e) => {
                  updateMediaGalleryItem({
                    contentUrl: `ipfs://${e.target.value}`,
                  });
                }}
              />
              <InputGroup.Append>
                <FormFile.Input
                  id="uploadCid"
                  style={{ backgroundColor: "#111320", border: "none" }}
                  accept=".glb, .usdz"
                  onChange={captureFile}
                  hidden
                ></FormFile.Input>
                <Button as="label" htmlFor="uploadCid" disabled={isUploading}>
                  {!isUploading ? "Upload" : spinner}
                </Button>
              </InputGroup.Append>
            </InputGroup>
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
        <Row className="px-3 d-flex align-items-end">
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
            <Form.Text className="text-primary mb-1">
              Content Pinning Service
            </Form.Text>
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
