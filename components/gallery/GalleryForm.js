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
import { GalleryFileFormat } from "./GalleryFileFormat";
import { isNullableType } from "graphql";

export function GalleryForm({
  ipfs,
  updatePinningData,
  pinningServiceEndpoint,
  pinningServiceAccessToken,
  setPinningServiceEndpoint,
  setPinningServiceAccessToken,
  mediaGalleryStreamManager,
  selectedMediaGalleryItemManager,
  setSelectedMediaGalleryItemId,
}) {
  const [pinningService, setPinningService] = React.useState("pinata");
  const [isSaving, setIsSaving] = React.useState(false);
  const [mediaGalleryItem, setMediaGalleryItem] = React.useState({});

  let encodings;
  if (mediaGalleryItem.encoding) {
    encodings = mediaGalleryItem.encoding;
  } else {
    encodings = [
      {
        contentUrl: mediaGalleryItem.contentUrl,
        encodingFormat: mediaGalleryItem.encodingFormat,
      },
    ];
  }

  React.useEffect(() => {
    if (!selectedMediaGalleryItemManager) {
      setMediaGalleryItem({});
      return;
    }

    const mediaGalleryItemContent = selectedMediaGalleryItemManager.getStreamContent();
    setMediaGalleryItem(mediaGalleryItemContent ?? {});
  }, [selectedMediaGalleryItemManager]);

  function updateMediaGalleryItem(updatedValues) {
    function _updateData(updatedValues) {
      return (prevState) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setMediaGalleryItem(_updateData(updatedValues));
  }

  function clearForm() {
    document.getElementById("galleryForm").reset();

    setMediaGalleryItem({});
    setPinningService("pinata");
    setPinningServiceEndpoint(PINATA_API_ENDPOINT);

    setSelectedMediaGalleryItemId(null);
  }

  async function addToGallery() {
    setIsSaving(true);

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
    // FIXME: Disabling pinning for now
    // pinCid(
    //   ipfs,
    //   pinningServiceEndpoint,
    //   pinningServiceAccessToken,
    //   mediaGalleryItem.name,
    //   mediaGalleryItem.contentUrl.replace("ipfs://", ""),
    //   updatePinningData
    // );

    setIsSaving(false);
  }

  async function saveChanges() {
    setIsSaving(true);

    if (mediaGalleryItem) {
      await selectedMediaGalleryItemManager.createOrUpdateStream(
        mediaGalleryItem
      );
    }

    clearForm();

    setIsSaving(false);
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

  function updateEncodingAtIndex(index, newEncoding) {
    let newEncodings = mediaGalleryItem.encoding ?? [];
    newEncodings[index] = newEncoding;
    updateMediaGalleryItem({
      "@type": "3DModel",
      encoding: newEncodings,
      encodingFormat: null,
      contentUrl: null,
    });
  }

  let isReadyToAdd =
    mediaGalleryItem.encoding &&
    mediaGalleryItem.encoding.length > 0 &&
    mediaGalleryItem.name &&
    pinningServiceEndpoint &&
    pinningServiceAccessToken &&
    !isSaving;

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
        {encodings.map((encoding, i) => (
          <GalleryFileFormat
            ipfs={ipfs}
            isReadOnly={selectedMediaGalleryItemManager}
            encodingObject={encoding}
            setEncodingObject={(newEncoding) =>
              updateEncodingAtIndex(i, newEncoding)
            }
          />
        ))}
        <Row className="px-3 d-flex align-items-end">
          <Col sm="12" lg="6" className="mb-3">
            <Form.Control
              style={{ backgroundColor: "#111320", border: "none" }}
              className="text-white"
              type="text"
              placeholder="Display Name of Media"
              value={mediaGalleryItem.name}
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
            {selectedMediaGalleryItemManager ? (
              <Button variant="secondary" onClick={saveChanges}>
                {isSaving ? spinner : "Save Changes"}
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled={!isReadyToAdd}
                onClick={addToGallery}
              >
                {isSaving ? spinner : "Add to Gallery"}
              </Button>
            )}
          </Col>
        </Row>
      </Form>
    </>
  );
}

export default GalleryForm;
