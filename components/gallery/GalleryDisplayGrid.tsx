import * as React from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { MediaGalleryItemStreamManager } from "../../lib/stream-managers/MediaGalleryItemStreamManager";
import GalleryDisplayItem from "./GalleryDisplayItem";
import { GalleryModalProps } from "./GalleryModal";

export type GalleryDisplayGridProps = GalleryModalProps & {
  mediaGalleryData: string[];
  mediaGalleryItems: Record<string, MediaGalleryItemStreamManager>;
  selectedMediaGalleryItemId: string | null;
  setSelectedMediaGalleryItemId: React.Dispatch<
    React.SetStateAction<string | null>
  >;
};

function GalleryDisplayGrid(props: GalleryDisplayGridProps) {
  const {
    mediaGalleryData,
    mediaGalleryItems,
    selectedMediaGalleryItemId,
    setSelectedMediaGalleryItemId,
  } = props;
  const data = mediaGalleryData
    .flatMap((docId) => mediaGalleryItems[docId])
    .filter((v) => v);

  return (
    <Row className="p-5 m-3 text-center" style={{ backgroundColor: "#111320" }}>
      {data.map((mediaGalleryItemStreamManager, i) => (
        <Col key={i} xs="12" lg="6" xl="4">
          <GalleryDisplayItem
            {...props}
            mediaGalleryItemStreamManager={mediaGalleryItemStreamManager}
            index={i}
            selectedMediaGalleryItemId={selectedMediaGalleryItemId}
            setSelectedMediaGalleryItemId={setSelectedMediaGalleryItemId}
          />
        </Col>
      ))}
      {data.length == 0 ? (
        <Col xs="12" className="text-muted">
          No items in gallery
        </Col>
      ) : null}
    </Row>
  );
}

export default GalleryDisplayGrid;
