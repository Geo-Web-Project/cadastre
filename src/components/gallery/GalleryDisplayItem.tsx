import * as React from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import { GalleryModalProps } from "./GalleryModal";
import { getFormatType } from "./GalleryFileFormat";
import { MediaGalleryItem } from "./GalleryForm";

const DISPLAY_TYPES: Record<string, string> = {
  "3DModel": "3D Model",
  ImageObject: "Image",
  VideoObject: "Video",
  AudioObject: "Audio",
};

export type GalleryDisplayItemProps = GalleryModalProps & {
  mediaGalleryItem: MediaGalleryItem;
  newMediaGallery: MediaGalleryItem[];
  setNewMediaGallery: React.Dispatch<
    React.SetStateAction<MediaGalleryItem[] | null>
  >;
  index: number;
  selectedMediaGalleryItemIndex: number | null;
  setSelectedMediaGalleryItemIndex: React.Dispatch<
    React.SetStateAction<number | null>
  >;
};

function GalleryDisplayItem(props: GalleryDisplayItemProps) {
  const {
    mediaGalleryItem,
    newMediaGallery,
    setNewMediaGallery,
    index,
    selectedMediaGalleryItemIndex,
    setSelectedMediaGalleryItemIndex,
  } = props;

  const [isHovered, setIsHovered] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);

  const isEditing = selectedMediaGalleryItemIndex === index;
  const shouldHighlight = !isRemoving && (isHovered || isEditing);
  const name = mediaGalleryItem?.name;
  const fileType = getFormatType(mediaGalleryItem.encodingFormat);

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

  async function removeMediaGalleryItem() {
    if (newMediaGallery) {
      setNewMediaGallery(
        newMediaGallery.filter(
          (item) => newMediaGallery.indexOf(item) !== index
        )
      );
    }
  }

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
        <Col>
          <Image
            style={statusView ? { opacity: "0.3" } : {}}
            src="file.png"
            width={70}
          />
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
