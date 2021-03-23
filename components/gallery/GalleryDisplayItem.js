import * as React from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";

const DISPLAY_TYPES = {
  "3DModel": "3D Model",
  ImageObject: "Image",
  VideoObject: "Video",
  AudioObject: "Audio",
};

export function GalleryDisplayItem({
  data,
  index,
  removeMediaGalleryItemAt,
  pinningData,
  updatePinningData,
}) {
  const [isHovered, setIsHovered] = React.useState(false);

  const pinningDataItem = pinningData[data.contentUri.replace("ipfs://", "")];
  const pinningStatus = pinningDataItem ? pinningDataItem.status : null;
  const isPinned = pinningStatus == "pinned";

  const spinner = (
    <div className="spinner-border" role="status">
      <span className="sr-only"></span>
    </div>
  );

  return (
    <Container
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`text-center p-3 rounded ${
        isHovered ? "border border-secondary" : ""
      }`}
    >
      <Row>
        <Col>
          <h1 style={{ fontSize: "1.5em" }}>
            {index + 1}. {data.name}
          </h1>
        </Col>
      </Row>
      <Row>
        <Col>
          <Image src="file.png" />
        </Col>
      </Row>
      <Row className="text-center">
        <Col>
          <p>{DISPLAY_TYPES[data["@type"]]}</p>
        </Col>
      </Row>
      <Row className="text-center text-primary mb-3">
        <Col>{isPinned ? "Pinned" : <>Pinning {spinner}</>}</Col>
      </Row>
      <Row style={{ visibility: isHovered ? "visible" : "hidden" }}>
        <Col>
          <Button variant="info">Unpin</Button>
        </Col>
        <Col>
          <Button
            variant="danger"
            onClick={() => {
              removeMediaGalleryItemAt(index);
            }}
          >
            Delete
          </Button>
        </Col>
      </Row>
    </Container>
  );
}

export default GalleryDisplayItem;
