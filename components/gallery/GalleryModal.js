import * as React from "react";
import Modal from "react-bootstrap/Modal";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Container from "react-bootstrap/Container";
import GalleryForm from "./GalleryForm";
import GalleryDisplayGrid from "./GalleryDisplayGrid";
import { STATE_PARCEL_SELECTED } from "../Map";
import {
  PINATA_API_ENDPOINT,
  MEDIA_GALLERY_ITEM_SCHEMA_DOCID,
  MEDIA_GALLERY_SCHEMA_DOCID,
} from "../../lib/constants";
import { unpinCid } from "../../lib/pinning";

export function GalleryModal({
  mediaGalleryDocId,
  setMediaGalleryDocId,
  show,
  setInteractionState,
  ceramic,
  ipfs,
}) {
  const handleClose = () => {
    setInteractionState(STATE_PARCEL_SELECTED);
  };

  const [pinningServiceEndpoint, setPinningServiceEndpoint] = React.useState(
    PINATA_API_ENDPOINT
  );

  const [
    pinningServiceAccessToken,
    setPinningServiceAccessToken,
  ] = React.useState("");

  const [mediaGalleryDoc, setMediaGalleryDoc] = React.useState(null);
  const [mediaGalleryData, setMediaGalleryData] = React.useState(null);
  const [mediaGalleryItems, setMediaGalleryItems] = React.useState({});

  React.useEffect(async () => {
    if (!mediaGalleryDocId) {
      setMediaGalleryData([]);
      return;
    }

    const doc = await ceramic.loadDocument(mediaGalleryDocId);
    setMediaGalleryDoc(doc);

    const queries = doc.content.map((docId) => {
      return { docId: docId, paths: [] };
    });
    const docMap = await ceramic.multiQuery(queries);

    const loadedItems = Object.keys(docMap).reduce((result, docId) => {
      result[docId] = docMap[docId].content;
      return result;
    }, {});
    setMediaGalleryItems(loadedItems);

    setMediaGalleryData(doc.content);
  }, [mediaGalleryDocId]);

  async function saveMediaGallery() {
    if (mediaGalleryDocId) {
      // Update doc
      await mediaGalleryDoc.change({
        content: mediaGalleryData,
      });
    } else {
      // Create doc
      const doc = await ceramic.createDocument("tile", {
        content: mediaGalleryData,
        metadata: {
          schema: MEDIA_GALLERY_SCHEMA_DOCID,
        },
      });
      const docId = doc.id.toString();
      setMediaGalleryDocId(docId);
    }

    handleClose();
  }

  async function addMediaGalleryItem(item) {
    function _addItem(item) {
      return (prevState) => {
        return prevState.concat(item);
      };
    }

    const doc = await ceramic.createDocument("tile", {
      content: item,
      metadata: {
        schema: MEDIA_GALLERY_ITEM_SCHEMA_DOCID,
      },
    });

    const docId = doc.id.toString();
    setMediaGalleryItems((prev) => {
      return { ...prev, [docId]: item };
    });

    setMediaGalleryData(_addItem(docId));
  }

  // Store pinning data in-memory for now
  const [pinningData, setPinningData] = React.useState({});
  function updatePinningData(updatedValues) {
    function _updateData(updatedValues) {
      return (prevState) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setPinningData(_updateData(updatedValues));
  }

  async function removeMediaGalleryItemAt(index) {
    const item = mediaGalleryItems[mediaGalleryData[index]];
    const cid = item.contentUrl.replace("ipfs://", "");

    setMediaGalleryData((prevState) => {
      return prevState.filter((item, i) => index != i);
    });

    await unpinCid(
      pinningData,
      pinningServiceEndpoint,
      pinningServiceAccessToken,
      cid,
      updatePinningData
    );
  }

  const spinner = (
    <div className="spinner-border" role="status">
      <span className="sr-only">Loading...</span>
    </div>
  );

  return (
    <Modal
      show={show}
      backdrop="static"
      keyboard={false}
      centered
      size="xl"
      onHide={handleClose}
    >
      <Modal.Header className="bg-dark border-0">
        <Container>
          <Row>
            <Col sm="11">
              <Modal.Title className="text-primary">
                Edit Media Gallery
              </Modal.Title>
            </Col>
            <Col sm="1" className="text-right">
              <Button variant="link" size="sm" onClick={handleClose}>
                <Image src="close.svg" />
              </Button>
            </Col>
          </Row>
        </Container>
      </Modal.Header>
      {mediaGalleryData != null ? (
        <>
          <Modal.Body className="bg-dark px-4 text-light">
            <p>
              Add content to this structured gallery for easy display on the{" "}
              <a>Geo Web Spatial Browser.</a>
            </p>
            <div className="border border-secondary rounded p-3">
              <GalleryForm
                ipfs={ipfs}
                addMediaGalleryItem={addMediaGalleryItem}
                updatePinningData={updatePinningData}
                pinningServiceEndpoint={pinningServiceEndpoint}
                pinningServiceAccessToken={pinningServiceAccessToken}
                setPinningServiceEndpoint={setPinningServiceEndpoint}
                setPinningServiceAccessToken={setPinningServiceAccessToken}
              />
              <GalleryDisplayGrid
                ipfs={ipfs}
                mediaGalleryData={mediaGalleryData}
                mediaGalleryItems={mediaGalleryItems}
                removeMediaGalleryItemAt={removeMediaGalleryItemAt}
                pinningData={pinningData}
                updatePinningData={updatePinningData}
                pinningServiceEndpoint={pinningServiceEndpoint}
                pinningServiceAccessToken={pinningServiceAccessToken}
              />
            </div>
          </Modal.Body>
          <Modal.Footer className="bg-dark border-0 pb-4">
            <Container>
              <Row className="text-right">
                <Col xs="12">
                  <Button
                    variant="primary"
                    // disabled={!isReadyToAdd}
                    onClick={saveMediaGallery}
                  >
                    Save Changes
                  </Button>
                </Col>
              </Row>
            </Container>
          </Modal.Footer>
        </>
      ) : (
        <Modal.Body className="bg-dark p-5 text-light text-center">
          {spinner}
        </Modal.Body>
      )}
    </Modal>
  );
}

export default GalleryModal;
