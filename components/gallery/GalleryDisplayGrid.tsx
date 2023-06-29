import { useLayoutEffect, useRef } from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import type { MediaObject } from "@geo-web/types";
import GalleryDisplayItem from "./GalleryDisplayItem";
import { GalleryModalProps } from "./GalleryModal";

export type GalleryDisplayGridProps = GalleryModalProps & {
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

function GalleryDisplayGrid(props: GalleryDisplayGridProps) {
  const { newMediaGallery, selectedMediaGalleryItemIndex } = props;

  const galleryDisplayRef = useRef<HTMLElement>(null);
  const prevMediaGalleryItems = useRef<MediaObject[]>(newMediaGallery);

  useLayoutEffect(() => {
    if (!galleryDisplayRef?.current) {
      return;
    }

    if (newMediaGallery.length > prevMediaGalleryItems.current.length) {
      galleryDisplayRef.current.scrollTo(
        0,
        galleryDisplayRef.current.scrollHeight
      );
    }

    prevMediaGalleryItems.current = [...newMediaGallery];
  }, [newMediaGallery]);

  return (
    <Row
      className="p-2 m-1 m-sm-3 text-center bg-blue overflow-auto rounded-4"
      style={{ height: 260 }}
      ref={galleryDisplayRef}
    >
      {newMediaGallery.map((mediaGalleryItem, i) => (
        <Col
          key={i}
          xs="12"
          lg="6"
          xl="4"
          className="d-flex align-items-center"
        >
          <GalleryDisplayItem
            {...props}
            mediaGalleryItem={mediaGalleryItem}
            index={i}
            selectedMediaGalleryItemIndex={selectedMediaGalleryItemIndex}
          />
        </Col>
      ))}
      {newMediaGallery.length == 0 ? (
        <Col
          xs="12"
          className="d-flex justify-content-center align-items-center text-muted"
        >
          No items in gallery
        </Col>
      ) : null}
    </Row>
  );
}

export default GalleryDisplayGrid;
