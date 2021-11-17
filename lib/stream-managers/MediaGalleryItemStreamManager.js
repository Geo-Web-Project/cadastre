import { TileStreamManager } from "./TileStreamManager";
import * as React from "react";

export class MediaGalleryItemStreamManager extends TileStreamManager {
  constructor(ceramic, _mediaGalleryStreamManager) {
    super(
      ceramic,
      _mediaGalleryStreamManager.dataStore.model.getSchemaURL(
        "mediaGalleryItem"
      ),
      _mediaGalleryStreamManager._controller
    );
    this.mediaGalleryStreamManager = _mediaGalleryStreamManager;
  }

  async setMediaGalleryStreamManager(_mediaGalleryStreamManager) {
    this.mediaGalleryStreamManager = _mediaGalleryStreamManager;
  }

  async createOrUpdateStream(content) {
    const newStreamId = await super.createOrUpdateStream(
      content,
      this._controller,
      false
    );

    return newStreamId;
  }

  async addToMediaGallery() {
    if (!this.mediaGalleryStreamManager) {
      console.error(`MediaGalleryStreamManager does not exist`);
      return;
    }

    const prevState = this.mediaGalleryStreamManager.getStreamContent() ?? {
      mediaGalleryItems: [],
    };
    const prevItems = prevState["mediaGalleryItems"] ?? [];
    const newItems = prevItems.concat(this.getStreamId().toString());
    await this.mediaGalleryStreamManager.createOrUpdateStream({
      mediaGalleryItems: newItems,
    });
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
    const prevState = this.mediaGalleryStreamManager.getStreamContent() ?? {
      mediaGalleryItems: [],
    };
    const prevItems = prevState["mediaGalleryItems"] ?? [];
    const newItems = prevItems.filter((item) => streamId.toString() != item);
    await this.mediaGalleryStreamManager.createOrUpdateStream({
      mediaGalleryItems: newItems,
    });

    // Unpin stream
    await this.ceramic.pin.rm(streamId);
  }
}

export function useMediaGalleryItemData(mediaGalleryStreamManager) {
  const [mediaGalleryItems, setMediaGalleryItems] = React.useState({});

  const state = mediaGalleryStreamManager
    ? mediaGalleryStreamManager.getStreamContent() ?? {
        mediaGalleryItems: [],
      }
    : null;
  const mediaGalleryData = state ? state["mediaGalleryItems"] ?? [] : null;

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
              mediaGalleryStreamManager.ceramic,
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
