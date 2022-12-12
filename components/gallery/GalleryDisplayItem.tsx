import * as React from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import BN from "bn.js";
import { AssetId, AccountId } from "caip";
import type { MediaObject } from "@geo-web/types";
import { GalleryModalProps } from "./GalleryModal";
import { getFormatType } from "./GalleryFileFormat";
import { NETWORK_ID } from "../../lib/constants";

const DISPLAY_TYPES: Record<string, string> = {
  "3DModel": "3D Model",
  ImageObject: "Image",
  VideoObject: "Video",
  AudioObject: "Audio",
};

export type GalleryDisplayItemProps = GalleryModalProps & {
  mediaGalleryItem: MediaObject;
  index: number;
  selectedMediaGalleryItemIndex: number | null;
  setSelectedMediaGalleryItemIndex: React.Dispatch<
    React.SetStateAction<number | null>
  >;
  setShouldMediaGalleryUpdate: React.Dispatch<React.SetStateAction<boolean>>;
};

function GalleryDisplayItem(props: GalleryDisplayItemProps) {
  const {
    mediaGalleryItem,
    geoWebContent,
    ceramic,
    licenseAddress,
    selectedParcelId,
    index,
    selectedMediaGalleryItemIndex,
    setSelectedMediaGalleryItemIndex,
    setShouldMediaGalleryUpdate,
  } = props;

  const [isHovered, setIsHovered] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);

  const isEditing = selectedMediaGalleryItemIndex !== null;
  const shouldHighlight = !isRemoving && (isHovered || isEditing);
  const name = mediaGalleryItem?.name;
  const fileType = getFormatType(mediaGalleryItem?.encodingFormat);

  const spinner = (
    <span className="spinner-border" role="status">
      <span className="visually-hidden"></span>
    </span>
  );

  let statusView;
  if (isRemoving) {
    statusView = (
      <Col className="text-white">
        <h4>Removing</h4>
        {spinner}
      </Col>
    );
  }

  const removeMediaGalleryItem = React.useCallback(async () => {
    if (!geoWebContent) {
      return;
    }

    setIsRemoving(true);

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
    const rootCid = await geoWebContent.raw.resolveRoot({
      ownerId,
      parcelId: assetId,
    });
    const mediaGallery = await geoWebContent.raw.getPath("/mediaGallery", {
      ownerId,
      parcelId: assetId,
    });
    const newRoot = await geoWebContent.raw.putPath(
      rootCid,
      `/mediaGallery`,
      mediaGallery.slice(0, index)
    );

    await geoWebContent.raw.commit(newRoot, {
      ownerId,
      parcelId: assetId,
      pin: true,
    });

    setShouldMediaGalleryUpdate(true);
    setIsRemoving(false);
  }, [geoWebContent, index]);

  function handleEdit() {
    setSelectedMediaGalleryItemIndex(index);
  }

  return (
    <Container
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`text-center p-3 rounded ${
        shouldHighlight ? "border border-secondary" : ""
      }`}
    >
      <Row>
        <Col style={statusView ? { opacity: "0.3" } : {}}>
          <h1 style={{ fontSize: "1.5em" }}>
            {index + 1}. {name}
          </h1>
        </Col>
      </Row>
      <Row>
        <Col style={{ height: "100px" }}>
          <Image style={statusView ? { opacity: "0.3" } : {}} src="file.png" />
          <div className="position-relative bottom-100">{statusView}</div>
        </Col>
      </Row>
      {fileType && (
        <Row
          className="text-center"
          style={statusView ? { opacity: "0.3" } : {}}
        >
          <Col>{DISPLAY_TYPES[fileType]}</Col>
        </Row>
      )}
      <Row
        style={{
          visibility: shouldHighlight ? "visible" : "hidden",
        }}
      >
        <Col>
          <Button variant="info" onClick={handleEdit} disabled={isEditing}>
            Edit
          </Button>
        </Col>
        <Col>
          <Button variant="danger" onClick={removeMediaGalleryItem}>
            Delete
          </Button>
        </Col>
      </Row>
    </Container>
  );
}

export default GalleryDisplayItem;
