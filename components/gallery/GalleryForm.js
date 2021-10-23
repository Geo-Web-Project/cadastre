import * as React from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import InputGroup from "react-bootstrap/InputGroup";
import FormFile from "react-bootstrap/FormFile";
import { PINATA_API_ENDPOINT } from "../../lib/constants";
import { MediaGalleryItemStreamManager } from "../../lib/stream-managers/MediaGalleryItemStreamManager";
import { useFirebase } from "../../lib/Firebase";

import { galleryFileFormats } from "./GalleryFileFormat";

export function GalleryForm({
  pinningManager,
  ipfs,
  mediaGalleryStreamManager,
  selectedMediaGalleryItemManager,
  setSelectedMediaGalleryItemId,
}) {
  const [pinningService, setPinningService] = React.useState("buckets");
  const [detectedFileFormat, setDetectedFileFormat] = React.useState(null);
  const [fileFormat, setFileFormat] = React.useState(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [didFail, setDidFail] = React.useState(false);

  const [mediaGalleryItem, setMediaGalleryItem] = React.useState({});
  const { firebasePerf } = useFirebase();

  const cid = mediaGalleryItem.contentUrl
    ? mediaGalleryItem.contentUrl.replace("ipfs://", "")
    : "";

  React.useEffect(() => {
    if (!selectedMediaGalleryItemManager) {
      setMediaGalleryItem({});
      return;
    }

    const mediaGalleryItemContent =
      selectedMediaGalleryItemManager.getStreamContent();
    setMediaGalleryItem(mediaGalleryItemContent ?? {});

    if (mediaGalleryItemContent) {
      setFileFormat(mediaGalleryItemContent.encodingFormat);
    }
  }, [selectedMediaGalleryItemManager]);

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

    // Manually preload synchronously
    ipfs.preload.stop();
    const added = await ipfs.add(file);
    ipfs.preload.start();
    await ipfs.preload(added.cid);

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
    setPinningService("buckets");
    setDidFail(false);

    setSelectedMediaGalleryItemId(null);
  }

  async function addToGallery() {
    setIsSaving(true);
    setDidFail(false);

    const trace = firebasePerf.trace("add_media_item_to_gallery");
    trace.start();

    if (mediaGalleryItem) {
      const _mediaGalleryItemStreamManager = new MediaGalleryItemStreamManager(
        mediaGalleryStreamManager.ceramic
      );
      await _mediaGalleryItemStreamManager.createOrUpdateStream(
        mediaGalleryItem
      );

      // Pin item
      const cid = mediaGalleryItem.contentUrl.replace("ipfs://", "");
      const name = `${_mediaGalleryItemStreamManager.getStreamId()}-${cid}`;

      try {
        await pinningManager.pinCid(name, cid);
      } catch (err) {
        setDidFail(true);
        setIsSaving(false);
        return;
      }

      // Add to gallery after pin
      _mediaGalleryItemStreamManager.setMediaGalleryStreamManager(
        mediaGalleryStreamManager
      );
      await _mediaGalleryItemStreamManager.addToMediaGallery();
    }

    clearForm();

    trace.stop();

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
    mediaGalleryItem.contentUrl && mediaGalleryItem.name && !isSaving;

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
      <Form id="galleryForm" className="pt-2 text-left">
        <Row className="px-3 d-flex align-items-end">
          <Col sm="12" lg="6" className="mb-3">
            <InputGroup>
              <Form.Control
                style={{ backgroundColor: "#111320", border: "none" }}
                className="text-white"
                type="text"
                placeholder="Upload media or add an existing CID"
                readOnly={isUploading || selectedMediaGalleryItemManager}
                value={cid}
                onChange={updateContentUrl}
              />
              <InputGroup.Append>
                <FormFile.Input
                  id="uploadCid"
                  style={{ backgroundColor: "#111320", border: "none" }}
                  accept=".glb, .usdz"
                  disabled={isUploading || selectedMediaGalleryItemManager}
                  onChange={captureFile}
                  hidden
                ></FormFile.Input>
                <Button
                  as="label"
                  htmlFor="uploadCid"
                  disabled={isUploading || selectedMediaGalleryItemManager}
                >
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
                value={detectedFileFormat ?? fileFormat}
                disabled={detectedFileFormat != null}
                custom
              >
                <option value="" selected>
                  Select a File Format
                </option>

                {galleryFileFormats.map((_format)=>(
                  <option value={_format.encoding}>
                    `{_format.extension} (${_format.extension})`
                  </option>
                ))}

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
              disabled
            >
              <option value="buckets">Geo Web Free (Default)</option>
            </Form.Control>
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
          {didFail ? (
            <Col className="text-danger">
              Failed to add item. An unknown error occurred.
            </Col>
          ) : null}
        </Row>
      </Form>
    </>
  );
}

export default GalleryForm;
