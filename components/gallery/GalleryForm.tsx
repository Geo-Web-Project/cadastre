/* eslint-disable import/no-unresolved */
import * as React from "react";
import BN from "bn.js";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import InputGroup from "react-bootstrap/InputGroup";
import type { MediaObject, Encoding } from "@geo-web/types";
import { AssetId, AccountId } from "caip";
import { CID } from "multiformats/cid";
import { GalleryModalProps } from "./GalleryModal";
import {
  galleryFileFormats,
  getFormat,
  getFormatCS,
} from "./GalleryFileFormat";
import { MediaGalleryItem } from "../../lib/geo-web-content/mediaGallery";
import { useFirebase } from "../../lib/Firebase";
import { NETWORK_ID } from "../../lib/constants";

interface NewMediaGalleryItem {
  name?: string;
  content?: string;
  encodingFormat?: string;
}

export type GalleryFormProps = GalleryModalProps & {
  mediaGalleryItems: MediaGalleryItem[];
  selectedMediaGalleryItemIndex: number | null;
  setSelectedMediaGalleryItemIndex: React.Dispatch<
    React.SetStateAction<number | null>
  >;
  setShouldMediaGalleryUpdate: React.Dispatch<React.SetStateAction<boolean>>;
};

function GalleryForm(props: GalleryFormProps) {
  const {
    licenseAddress,
    selectedParcelId,
    geoWebContent,
    ceramic,
    mediaGalleryItems,
    selectedMediaGalleryItemIndex,
    setSelectedMediaGalleryItemIndex,
    ipfs,
    setShouldMediaGalleryUpdate,
  } = props;
  const [detectedFileFormat, setDetectedFileFormat] = React.useState(null);
  const [fileFormat, setFileFormat] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [didFail, setDidFail] = React.useState(false);

  const [mediaGalleryItem, setMediaGalleryItem] =
    React.useState<NewMediaGalleryItem>({});
  const { firebasePerf } = useFirebase();

  const cid = mediaGalleryItem.content
    ? mediaGalleryItem.content.replace("ipfs://", "")
    : "";

  React.useEffect(() => {
    if (selectedMediaGalleryItemIndex === null) {
      return;
    }

    setFileFormat(
      mediaGalleryItems[selectedMediaGalleryItemIndex].encodingFormat
    );
    setMediaGalleryItem({
      name: mediaGalleryItems[selectedMediaGalleryItemIndex].name,
      content:
        mediaGalleryItems[selectedMediaGalleryItemIndex].content.toString(),
      encodingFormat:
        mediaGalleryItems[selectedMediaGalleryItemIndex].encodingFormat,
    });
  }, [selectedMediaGalleryItemIndex]);

  function updateMediaGalleryItem(updatedValues: NewMediaGalleryItem) {
    function _updateData(updatedValues: NewMediaGalleryItem) {
      return (prevState: NewMediaGalleryItem) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setMediaGalleryItem(_updateData(updatedValues));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function updateContentUrl(event: React.ChangeEvent<any>) {
    const cid = event.target.value;

    if (!cid || cid.length == 0) {
      updateMediaGalleryItem({
        content: undefined,
      });

      setDetectedFileFormat(null);
      setFileFormat(null);

      return;
    }

    updateMediaGalleryItem({
      content: `ipfs://${cid}`,
      encodingFormat: fileFormat ?? undefined,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    const { encoding } = format;
    setFileFormat(encoding ?? null);

    // Add to IPFS
    const added = await ipfs.add(file);

    updateMediaGalleryItem({
      content: `ipfs://${added.cid.toString()}`,
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

    setSelectedMediaGalleryItemIndex(null);
  }

  async function addToGallery() {
    if (!geoWebContent) {
      return;
    }

    setIsSaving(true);
    setDidFail(false);

    const trace = firebasePerf?.trace("add_media_item_to_gallery");
    trace?.start();

    await commitNewRoot(mediaGalleryItem);
    clearForm();

    trace?.stop();

    setShouldMediaGalleryUpdate(true);
    setIsSaving(false);
  }

  async function saveChanges() {
    setIsSaving(true);

    await commitNewRoot(mediaGalleryItem);
    clearForm();

    setIsSaving(false);
    setSelectedMediaGalleryItemIndex(null);
    setShouldMediaGalleryUpdate(true);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onSelectFileFormat(event: React.ChangeEvent<any>) {
    setFileFormat(event.target.value);

    updateMediaGalleryItem({
      encodingFormat: event.target.value,
    });
  }

  function onSelectPinningService() {
    // setPinningService(event.target.value);
    // if (event.target.value != "pinata") {
    //   setPinningServiceEndpoint("");
    // } else {
    //   setPinningServiceEndpoint(PINATA_API_ENDPOINT);
    // }
    // setPinningServiceAccessToken("");
  }

  const commitNewRoot = React.useCallback(
    async (mediaGalleryItem: NewMediaGalleryItem) => {
      if (!geoWebContent) {
        return;
      }
      const assetId = new AssetId({
        chainId: `eip155:${NETWORK_ID}`,
        assetName: {
          namespace: "erc721",
          reference: licenseAddress.toLowerCase(),
        },
        tokenId: new BN(selectedParcelId.slice(2), "hex").toString(10),
      });
      const ownerId = new AccountId(
        AccountId.parse(ceramic.did?.parent.split("did:pkh:")[1] ?? "")
      );
      const mediaGallery = await geoWebContent.raw.getPath("/mediaGallery", {
        ownerId,
        parcelId: assetId,
      });
      const cidStr = mediaGalleryItem.content?.replace("ipfs://", "");
      const mediaObject: MediaObject = {
        name: mediaGalleryItem.name ?? "",
        content: CID.parse(cidStr ?? ""),
        encodingFormat: mediaGalleryItem.encodingFormat as Encoding,
      };
      const rootCid = await geoWebContent.raw.resolveRoot({
        ownerId,
        parcelId: assetId,
      });
      const newRoot = await geoWebContent.raw.putPath(
        rootCid,
        selectedMediaGalleryItemIndex !== null
          ? `/mediaGallery/${selectedMediaGalleryItemIndex}`
          : `/mediaGallery/${mediaGallery.length}`,
        mediaObject,
        { parentSchema: "MediaGallery"}
      );

      await geoWebContent.raw.commit(newRoot, {
        ownerId,
        parcelId: assetId,
        pin: true,
      });
    },
    [geoWebContent, selectedMediaGalleryItemIndex]
  );

  const isReadyToAdd =
    mediaGalleryItem.content && mediaGalleryItem.name && !isSaving;

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
                readOnly={isUploading || selectedMediaGalleryItemIndex !== null}
                value={cid}
                onChange={updateContentUrl}
              />
              <Form.Control
                type="file"
                id="uploadCid"
                style={{ backgroundColor: "#111320", border: "none" }}
                className="mt-1"
                accept={getFormatCS()}
                disabled={isUploading || selectedMediaGalleryItemIndex !== null}
                onChange={captureFile}
                hidden
              ></Form.Control>
              <Button
                as="label"
                htmlFor="uploadCid"
                disabled={isUploading || selectedMediaGalleryItemIndex !== null}
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
                value={detectedFileFormat ?? fileFormat ?? ""}
                required
                disabled={detectedFileFormat != null}
              >
                <option value="">Select a File Format</option>

                {galleryFileFormats.map((_format, i) => (
                  <option key={i} value={_format.encoding}>
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
              value={mediaGalleryItem.name ?? ""}
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
            {selectedMediaGalleryItemIndex !== null ? (
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
