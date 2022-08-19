/* eslint-disable import/no-unresolved */
import * as React from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import InputGroup from "react-bootstrap/InputGroup";
import { MediaGalleryItemStreamManager } from "../../lib/stream-managers/MediaGalleryItemStreamManager";
import { useFirebase } from "../../lib/Firebase";
import { CID } from "multiformats/cid";

import {
  galleryFileFormats,
  getFormat,
  getFormatCS,
  getFormatType,
} from "./GalleryFileFormat";
import { MediaGalleryStreamManager } from "../../lib/stream-managers/MediaGalleryStreamManager";
import { MediaObject } from "schema-org-ceramic/types/MediaObject.schema";
import { GalleryModalProps } from "./GalleryModal";

export type GalleryFormProps = GalleryModalProps & {
  mediaGalleryStreamManager: MediaGalleryStreamManager | null;
  selectedMediaGalleryItemManager: MediaGalleryItemStreamManager | null;
  setSelectedMediaGalleryItemId: React.Dispatch<
    React.SetStateAction<string | null>
  >;
};

function GalleryForm(props: GalleryFormProps) {
  const {
    mediaGalleryStreamManager,
    selectedMediaGalleryItemManager,
    setSelectedMediaGalleryItemId,
    ipfs,
    assetContentManager,
    pinningManager,
    selectedParcelId,
    setSelectedParcelId,
  } = props;
  const [detectedFileFormat, setDetectedFileFormat] = React.useState(null);
  const [fileFormat, setFileFormat] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [didFail, setDidFail] = React.useState(false);

  const [mediaGalleryItem, setMediaGalleryItem] = React.useState<MediaObject>(
    {}
  );
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
      setFileFormat(mediaGalleryItemContent.encodingFormat ?? null);
    }
  }, [selectedMediaGalleryItemManager]);

  function updateMediaGalleryItem(updatedValues: MediaObject) {
    function _updateData(updatedValues: MediaObject) {
      return (prevState: MediaObject) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setMediaGalleryItem(_updateData(updatedValues));
  }

  function updateContentUrl(event: React.ChangeEvent<any>) {
    const cid = event.target.value;

    if (!cid || cid.length == 0) {
      updateMediaGalleryItem({
        contentUrl: undefined,
      });

      setDetectedFileFormat(null);
      setFileFormat(null);

      return;
    }

    updateMediaGalleryItem({
      //"@type": "3DModel",
      contentUrl: `ipfs://${cid}`,
      encodingFormat: fileFormat ?? undefined,
    });
  }

  async function captureFile(event: React.ChangeEvent<any>) {
    event.persist();
    event.stopPropagation();
    event.preventDefault();

    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setIsUploading(true);

    const format = getFormat(file.name);
    const { encoding, type } = format;
    setFileFormat(encoding ?? null);

    // Add to IPFS
    const added = await ipfs.add(file);

    updateMediaGalleryItem({
      "@type": type,
      contentUrl: `ipfs://${added.cid.toString()}`,
      encodingFormat: encoding,
    });

    setIsUploading(false);
  }

  function clearForm() {
    const form = document.getElementById("galleryForm") as HTMLFormElement;
    form.reset();

    setDetectedFileFormat(null);
    setFileFormat(null);
    setMediaGalleryItem({});
    // setPinningService("buckets");
    setDidFail(false);

    setSelectedMediaGalleryItemId(null);
  }

  async function addToGallery() {
    setIsSaving(true);
    setDidFail(false);

    const trace = firebasePerf?.trace("add_media_item_to_gallery");
    trace?.start();

    if (
      mediaGalleryItem &&
      assetContentManager &&
      mediaGalleryStreamManager &&
      pinningManager
    ) {
      const _mediaGalleryItemStreamManager = new MediaGalleryItemStreamManager(
        assetContentManager,
        mediaGalleryStreamManager
      );
      await _mediaGalleryItemStreamManager.createOrUpdateStream(
        mediaGalleryItem
      );

      // Pin item
      const cidStr = mediaGalleryItem.contentUrl?.replace("ipfs://", "");
      const cid = cidStr ? CID.parse(cidStr) : null;
      const name = cid
        ? `${_mediaGalleryItemStreamManager.getStreamId()}-${cid}`
        : null;

      if (cid && name) {
        try {
          await pinningManager.pinCid(name, cid);
        } catch (err) {
          console.error(err);
          setDidFail(true);
          setIsSaving(false);
          return;
        }
      }

      // Add to gallery after pin
      _mediaGalleryItemStreamManager.setMediaGalleryStreamManager(
        mediaGalleryStreamManager
      );
      await _mediaGalleryItemStreamManager.addToMediaGallery();

      // Reload parcel
      const oldParcelId = selectedParcelId;
      setSelectedParcelId("");
      setSelectedParcelId(oldParcelId);
    }

    clearForm();

    trace?.stop();

    setIsSaving(false);
  }

  async function saveChanges() {
    setIsSaving(true);

    if (mediaGalleryItem) {
      await selectedMediaGalleryItemManager?.createOrUpdateStream(
        mediaGalleryItem
      );
    }

    clearForm();

    setIsSaving(false);
  }

  function onSelectFileFormat(event: React.ChangeEvent<any>) {
    setFileFormat(event.target.value);

    updateMediaGalleryItem({
      "@type": getFormatType(event.target.value),
      encodingFormat: event.target.value,
    });
  }

  function onSelectPinningService(event: React.ChangeEvent<any>) {
    // setPinningService(event.target.value);
    // if (event.target.value != "pinata") {
    //   setPinningServiceEndpoint("");
    // } else {
    //   setPinningServiceEndpoint(PINATA_API_ENDPOINT);
    // }
    // setPinningServiceAccessToken("");
  }

  const isReadyToAdd =
    mediaGalleryItem.contentUrl && mediaGalleryItem.name && !isSaving;

  const spinner = (
    <span
      className="spinner-border"
      role="status"
      style={{ height: "1.5em", width: "1.5em" }}
    >
      <span className="visually-hidden"></span>
    </span>
  );

  return (
    <>
      <Form id="galleryForm" className="pt-2 text-start">
        <Row className="px-3 d-flex align-items-end">
          <Col sm="12" lg="6" className="mb-3">
            <InputGroup>
              <Form.Control
                style={{ backgroundColor: "#111320", border: "none" }}
                className="text-white mt-1"
                type="text"
                placeholder="Upload media or add an existing CID"
                readOnly={
                  isUploading || selectedMediaGalleryItemManager != null
                }
                value={cid}
                onChange={updateContentUrl}
              />
              <Form.Control
                type="file"
                id="uploadCid"
                style={{ backgroundColor: "#111320", border: "none" }}
                className="mt-1"
                accept={getFormatCS()}
                disabled={
                  isUploading || selectedMediaGalleryItemManager != null
                }
                onChange={captureFile}
                hidden
              ></Form.Control>
              <Button
                as="label"
                htmlFor="uploadCid"
                disabled={
                  isUploading || selectedMediaGalleryItemManager != null
                }
              >
                {!isUploading ? "Upload" : spinner}
              </Button>
            </InputGroup>
            {/* {isUploading ? <ProgressBar now={uploadProgress} /> : null} */}
          </Col>
          <Col sm="12" lg="6" className="mb-3">
            <div key="inline-radio">
              <Form.Text className="text-primary mb-1">File Format</Form.Text>
              <Form.Control
                as="select"
                className="text-white mt-1"
                style={{ backgroundColor: "#111320", border: "none" }}
                onChange={onSelectFileFormat}
                value={detectedFileFormat ?? fileFormat ?? undefined}
                required
                disabled={detectedFileFormat != null}
              >
                <option value="" selected>
                  Select a File Format
                </option>

                {galleryFileFormats.map((_format) => (
                  <option value={_format.encoding}>
                    {_format.extension} ({_format.encoding})
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
              className="text-white mt-1"
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
              className="text-white mt-1"
              style={{ backgroundColor: "#111320", border: "none" }}
              onChange={onSelectPinningService}
              disabled
            >
              <option value="buckets">Geo Web Free (Default)</option>
            </Form.Control>
          </Col>
        </Row>
        <Row className="px-3 text-end">
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
