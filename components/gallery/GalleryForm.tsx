/* eslint-disable import/no-unresolved */
import * as React from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Spinner from "react-bootstrap/Spinner";
import InputGroup from "react-bootstrap/InputGroup";
import type { MediaObject, Encoding } from "@geo-web/types";
import { CID } from "multiformats/cid";
import { GalleryModalProps } from "./GalleryModal";
import {
  galleryFileFormats,
  getFormat,
  getFormatCS,
} from "./GalleryFileFormat";
import { uploadFile } from "@web3-storage/upload-client";
import { useMediaQuery } from "../../lib/mediaQuery";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import UploadNFTModal from "./UploadNFTModal";

interface MediaGalleryItem {
  name?: string;
  content?: string;
  encodingFormat?: string;
}

export type GalleryFormProps = GalleryModalProps & {
  newMediaGallery: MediaObject[];
  setNewMediaGallery: React.Dispatch<
    React.SetStateAction<MediaObject[] | null>
  >;
  selectedMediaGalleryItemIndex: number | null;
  shouldMediaGalleryUpdate: boolean;
  setSelectedMediaGalleryItemIndex: React.Dispatch<
    React.SetStateAction<number | null>
  >;
  setShouldMediaGalleryUpdate: React.Dispatch<React.SetStateAction<boolean>>;
};

function GalleryForm(props: GalleryFormProps) {
  const {
    geoWebContent,
    w3InvocationConfig,
    newMediaGallery,
    setNewMediaGallery,
    selectedMediaGalleryItemIndex,
    setSelectedMediaGalleryItemIndex,
  } = props;

  const [detectedFileFormat, setDetectedFileFormat] = React.useState(null);
  const [fileFormat, setFileFormat] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isUploadingNFT, setIsUploadingNFT] = React.useState(false);
  const [didFail, setDidFail] = React.useState(false);
  const [mediaGalleryItem, setMediaGalleryItem] =
    React.useState<MediaGalleryItem>({});

  const { isMobile } = useMediaQuery();

  const [showNFTModal, setShowNFTModal] = React.useState(false);

  const handleOpenModal = () => {
    setShowNFTModal(true);
  };

  const handleCloseModal = () => {
    setShowNFTModal(false);
  };

  React.useEffect(() => {
    if (selectedMediaGalleryItemIndex === null) {
      return;
    }

    setFileFormat(
      newMediaGallery[selectedMediaGalleryItemIndex].encodingFormat
    );
    setMediaGalleryItem({
      name: newMediaGallery[selectedMediaGalleryItemIndex].name,
      content:
        newMediaGallery[selectedMediaGalleryItemIndex].content.toString(),
      encodingFormat:
        newMediaGallery[selectedMediaGalleryItemIndex].encodingFormat,
    });
  }, [selectedMediaGalleryItemIndex]);

  function updateMediaGalleryItem(updatedValues: MediaGalleryItem) {
    function _updateData(updatedValues: MediaGalleryItem) {
      return (prevState: MediaGalleryItem) => {
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
      content: cid,
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

    // Upload to Web3 storage
    const added = await uploadFile(w3InvocationConfig, file);

    updateMediaGalleryItem({
      content: added.toString(),
      encodingFormat: encoding,
    });

    setIsUploading(false);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function uploadNFT(file: File, title: string) {
    if (!file) {
      return;
    }

    setIsUploadingNFT(true);

    const format = getFormat(file.name);
    const { encoding } = format;
    setFileFormat(encoding ?? null);

    // Upload to Web3 storage
    const added = await uploadFile(w3InvocationConfig, file);

    updateMediaGalleryItem({
      name: title,
      content: added.toString(),
      encodingFormat: encoding,
    });

    setIsUploadingNFT(false);
  }

  function clearForm() {
    const form = document.getElementById("galleryForm") as HTMLFormElement;
    form.reset();

    setDetectedFileFormat(null);
    setFileFormat(null);
    setMediaGalleryItem({});
    setDidFail(false);
    setSelectedMediaGalleryItemIndex(null);
  }

  async function updateMediaGalleryView() {
    if (!geoWebContent) {
      return;
    }

    const mediaObject = {
      name: mediaGalleryItem.name ?? "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: CID.parse(mediaGalleryItem.content ?? "") as any,
      encodingFormat: mediaGalleryItem.encodingFormat as Encoding,
    };

    if (selectedMediaGalleryItemIndex !== null) {
      setNewMediaGallery(
        newMediaGallery.map((item, i) => {
          if (i == selectedMediaGalleryItemIndex) {
            return mediaObject;
          } else {
            return item;
          }
        })
      );
    } else {
      setNewMediaGallery([...newMediaGallery, mediaObject]);
    }

    clearForm();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onSelectFileFormat(event: React.ChangeEvent<any>) {
    setFileFormat(event.target.value);

    updateMediaGalleryItem({
      encodingFormat: event.target.value,
    });
  }

  const isReadyToAdd = mediaGalleryItem.content && mediaGalleryItem.name;

  return (
    <>
      {showNFTModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(5px)",
            zIndex: 999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        />
      )}

      <Form id="galleryForm" className="pt-2 text-start">
        <Row className="px-1 px-sm-3 d-flex align-items-end">
          <Col sm="12" lg="6" className="mb-3">
            <Form.Text className="text-primary">CID</Form.Text>
            <InputGroup>
              <OverlayTrigger
                key="uploadCid"
                placement="top"
                overlay={<Tooltip id={`tooltip-key`}>Device Upload</Tooltip>}
              >
                <Button
                  variant="secondary"
                  style={{ height: 35, width: 42 }}
                  className="d-flex justify-content-center align-items-center mt-1"
                  as="label"
                  htmlFor="uploadCid"
                  disabled={
                    isUploading || selectedMediaGalleryItemIndex !== null
                  }
                >
                  {isUploading ? (
                    <Spinner
                      size="sm"
                      animation="border"
                      role="status"
                      variant="light"
                    >
                      <span className="visually-hidden">Loading...</span>
                    </Spinner>
                  ) : (
                    <Image src="upload.svg" alt="upload" width={24} />
                  )}
                </Button>
              </OverlayTrigger>
              <OverlayTrigger
                key="uploadNFT"
                placement="top"
                overlay={
                  <Tooltip id={`tooltip-key`}>Select from Wallet</Tooltip>
                }
              >
                <Button
                  variant="secondary"
                  style={{ height: 35, width: 42 }}
                  className="d-flex justify-content-center align-items-center mt-1"
                  as="label"
                  onClick={handleOpenModal}
                  disabled={
                    isUploadingNFT || selectedMediaGalleryItemIndex !== null
                  }
                >
                  {isUploadingNFT ? (
                    <Spinner
                      size="sm"
                      animation="border"
                      role="status"
                      variant="light"
                    >
                      <span className="visually-hidden">Loading...</span>
                    </Spinner>
                  ) : (
                    <Image
                      src="account-balance-wallet.svg"
                      alt="upload"
                      width={24}
                    />
                  )}
                </Button>
              </OverlayTrigger>
              <Form.Control
                style={{ backgroundColor: "#111320", border: "none" }}
                className="text-white mt-1 rounded-2"
                type="text"
                placeholder="Upload media or add an existing CID"
                readOnly={isUploading || selectedMediaGalleryItemIndex !== null}
                value={mediaGalleryItem?.content ?? ""}
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
              <UploadNFTModal
                showNFTModal={showNFTModal}
                onClose={handleCloseModal}
                uploadNFT={uploadNFT}
                {...props}
              />
            </InputGroup>
          </Col>
          <Col sm="12" lg="6" className="mb-3">
            <Form.Text className="text-primary mb-1">Name</Form.Text>
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
        </Row>
        <Row className="px-1 px-sm-3 d-flex align-items-end">
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
          {!isMobile && (
            <Col sm="12" lg="6" className="mb-3">
              <Form.Text className="text-primary mb-1">
                Content Pinning Service
              </Form.Text>
              <Form.Control
                as="select"
                className="text-white mt-1"
                style={{ backgroundColor: "#111320", border: "none" }}
                disabled
              >
                <option value="buckets">Geo Web Free (Default)</option>
              </Form.Control>
            </Col>
          )}
        </Row>
        <Row className="px-1 px-sm-3 text-end justify-content-end">
          <Col xs="6" md="6" lg="2" className="mb-3">
            <Button
              variant="info"
              disabled={!fileFormat}
              onClick={clearForm}
              className="w-100"
            >
              <Image src="close.svg" alt="done" width={28} />
            </Button>
          </Col>
          <Col xs="6" md="6" lg="2">
            <Button
              variant="primary"
              disabled={!isReadyToAdd}
              className="w-100"
              onClick={updateMediaGalleryView}
            >
              <Image src="done.svg" alt="done" width={28} />
            </Button>
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
