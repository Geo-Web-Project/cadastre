import { TileStreamManager } from "./TileStreamManager";
import { MEDIA_GALLERY_ITEM_SCHEMA_STREAMID } from "../constants";
import * as React from "react";

export class MediaGalleryItemStreamManager extends TileStreamManager {
  constructor(ceramic, _mediaGalleryStreamManager) {
    super(ceramic, MEDIA_GALLERY_ITEM_SCHEMA_STREAMID);
    this.mediaGalleryStreamManager = null;
  }

  async setMediaGalleryStreamManager(_mediaGalleryStreamManager) {
    this.mediaGalleryStreamManager = _mediaGalleryStreamManager;
  }

  async createOrUpdateStream(content) {
    const newStreamId = await super.createOrUpdateStream(content);
    if (newStreamId && this.mediaGalleryStreamManager) {
      // Add item to media gallery
      await this.addToMediaGallery();
    }

    return newStreamId;
  }

  async addToMediaGallery() {
    if (!this.mediaGalleryStreamManager) {
      console.error(`MediaGalleryStreamManager does not exist`);
      return;
    }

    const prevState = this.mediaGalleryStreamManager.getStreamContent() ?? [];
    await this.mediaGalleryStreamManager.createOrUpdateStream(
      prevState.concat(this.getStreamId().toString())
    );
  }
  async removeFromMediaGallery() {
    const streamId = this.getStreamId();
    if (!streamId) {
      return;
    }
    if (!this.mediaGalleryStreamManager) {
      console.error(`MediaGalleryStreamManager does not exist`);
      return;
    }
    const prevState = this.mediaGalleryStreamManager.getStreamContent() ?? [];
    const newState = prevState.filter((item) => streamId.toString() != item);
    await this.mediaGalleryStreamManager.createOrUpdateStream(newState);

    // Unpin stream
    await this.ceramic.pin.rm(streamId);
  }
}

export function useMediaGalleryItemData(mediaGalleryStreamManager) {
  const [mediaGalleryItems, setMediaGalleryItems] = React.useState({});

  const mediaGalleryData = mediaGalleryStreamManager
    ? mediaGalleryStreamManager.getStreamContent() ?? []
    : null;

  const mediaGalleryLength = mediaGalleryData ? mediaGalleryData.length : 0;

  React.useEffect(() => {
    if (!mediaGalleryData) {
      return;
    }

    async function updateItems() {
      const loadedItems = await mediaGalleryStreamManager.loadItems();
      const mediaGalleryItems = Object.keys(loadedItems).reduce(
        (result, docId) => {
          const _mediaGalleryItemStreamManager =
            new MediaGalleryItemStreamManager(
              mediaGalleryStreamManager.ceramic
            );
          _mediaGalleryItemStreamManager.setMediaGalleryStreamManager(
            mediaGalleryStreamManager
          );
          _mediaGalleryItemStreamManager.stream = loadedItems[docId];
          result[docId] = _mediaGalleryItemStreamManager;
          return result;
        },
        {}
      );

      setMediaGalleryItems(mediaGalleryItems);
    }

    updateItems();
  }, [mediaGalleryLength]);

  return {
    mediaGalleryData: mediaGalleryData,
    mediaGalleryItems: mediaGalleryItems,
  };
}
