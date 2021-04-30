import * as React from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import InputGroup from "react-bootstrap/InputGroup";
import FormFile from "react-bootstrap/FormFile";
import { PINATA_API_ENDPOINT } from "../../lib/constants";
import { pinCid } from "../../lib/pinning";
import { MediaGalleryItemStreamManager } from "../../lib/stream-managers/MediaGalleryItemStreamManager";

export function GalleryForm({
  ipfs,
  updatePinningData,
  pinningServiceEndpoint,
  pinningServiceAccessToken,
  setPinningServiceEndpoint,
  setPinningServiceAccessToken,
  mediaGalleryStreamManager,
}) {
  const [pinningService, setPinningService] = React.useState("pinata");
  const [detectedFileFormat, setDetectedFileFormat] = React.useState(null);
  const [fileFormat, setFileFormat] = React.useState(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isAdding, setIsAdding] = React.useState(false);

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

  function updateContentUrl(event) {
    const cid = event.target.value;

    if (!cid || cid.length == 0) {
      updateMediaGalleryItem({
        contentUrl: null,
      });

      setDetectedFileFormat(null);
      setFileFormat(null);

      return;
    }

    updateMediaGalleryItem({
      "@type": "3DModel",
      contentUrl: `ipfs://${cid}`,
      encodingFormat: fileFormat,
    });
  }

  async function captureFile(event) {
    event.stopPropagation();
    event.preventDefault();

    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setIsUploading(true);

    let format;
    if (file.name.endsWith(".glb")) {
      format = "model/gltf-binary";
    } else if (file.name.endsWith(".usdz")) {
      format = "model/vnd.usdz+zip";
    }

    setDetectedFileFormat(format);

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

    setDetectedFileFormat(null);
    setFileFormat(null);
    setMediaGalleryItem({});
    setPinningService("pinata");
    setPinningServiceEndpoint(PINATA_API_ENDPOINT);
  }

  async function addToGallery() {
    setIsAdding(true);

    if (mediaGalleryItem) {
      const _mediaGalleryItemStreamManager = new MediaGalleryItemStreamManager(
        mediaGalleryStreamManager.ceramic
      );
      _mediaGalleryItemStreamManager.setMediaGalleryStreamManager(
        mediaGalleryStreamManager
      );
      await _mediaGalleryItemStreamManager.createOrUpdateStream(
        mediaGalleryItem
      );
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

    setIsAdding(false);
  }

  function onSelectFileFormat(event) {
    setFileFormat(event.target.value);

    updateMediaGalleryItem({
      encodingFormat: event.target.value,
    });
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
    pinningServiceAccessToken &&
    !isAdding;

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
      <Form id="galleryForm" className="pt-2">
        <Row className="px-3 d-flex align-items-end">
          <Col sm="12" lg="6" className="mb-3">
            <InputGroup>
              <Form.Control
                style={{ backgroundColor: "#111320", border: "none" }}
                className="text-white"
                type="text"
                placeholder="Upload media or add an existing CID"
                readOnly={isUploading}
                value={cid}
                onChange={updateContentUrl}
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
              <Form.Text className="text-primary mb-1">File Format</Form.Text>
              <Form.Control
                as="select"
                className="text-white"
                style={{ backgroundColor: "#111320", border: "none" }}
                onChange={onSelectFileFormat}
                value={detectedFileFormat}
                disabled={detectedFileFormat != null}
                custom
              >
                <option selected>Select a File Format</option>
                <option value="model/gltf-binary">
                  .glb (model/gltf-binary)
                </option>
                <option value="model/vnd.usdz+zip">
                  .usdz (model/vnd.usdz+zip)
                </option>
              </Form.Control>
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
              {isAdding ? spinner : "Add to Gallery"}
            </Button>
          </Col>
        </Row>
      </Form>
    </>
  );
}

export default GalleryForm;
