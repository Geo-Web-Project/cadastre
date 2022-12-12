import * as React from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import type { MediaObject } from "@geo-web/types";
import GalleryDisplayItem from "./GalleryDisplayItem";
import { GalleryModalProps } from "./GalleryModal";

export type GalleryDisplayGridProps = GalleryModalProps & {
  mediaGalleryItems: MediaObject[];
  selectedMediaGalleryItemIndex: number | null;
  setSelectedMediaGalleryItemIndex: React.Dispatch<
    React.SetStateAction<number | null>
  >;
  setShouldMediaGalleryUpdate: React.Dispatch<
    React.SetStateAction<boolean>
  >;
};

function GalleryDisplayGrid(props: GalleryDisplayGridProps) {
  const {
    mediaGalleryItems,
    selectedMediaGalleryItemIndex,
    setSelectedMediaGalleryItemIndex,
  } = props;

  return (
    <Row className="p-5 m-3 text-center" style={{ backgroundColor: "#111320" }}>
      {mediaGalleryItems.map((mediaGalleryItem, i) => (
        <Col key={i} xs="12" lg="6" xl="4">
          <GalleryDisplayItem
            {...props}
            mediaGalleryItem={mediaGalleryItem}
            index={i}
            selectedMediaGalleryItemIndex={selectedMediaGalleryItemIndex}
            setSelectedMediaGalleryItemIndex={setSelectedMediaGalleryItemIndex}
          />
        </Col>
      ))}
      {mediaGalleryItems.length == 0 ? (
        <Col xs="12" className="text-muted">
          No items in gallery
        </Col>
      ) : null}
    </Row>
  );
}

export default GalleryDisplayGrid;
