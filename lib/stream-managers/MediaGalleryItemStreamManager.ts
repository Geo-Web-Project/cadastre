/* eslint-disable import/no-unresolved */
import { TileStreamManager } from "./TileStreamManager";
import * as React from "react";
import { MediaGalleryStreamManager } from "./MediaGalleryStreamManager";
import { MediaObject } from "schema-org-ceramic/types/MediaObject.schema";
import { AssetContentManager } from "../AssetContentManager";

export class MediaGalleryItemStreamManager extends TileStreamManager<MediaObject> {
  assetContentManager: AssetContentManager;
  mediaGalleryStreamManager: MediaGalleryStreamManager;

  constructor(
    _assetContentManager: AssetContentManager,
    _mediaGalleryStreamManager: MediaGalleryStreamManager
  ) {
    super(
      _assetContentManager.ceramic,
      _assetContentManager.model.getSchemaURL("MediaGalleryItem"),
      _assetContentManager.controller
    );
    this.assetContentManager = _assetContentManager;
    this.mediaGalleryStreamManager = _mediaGalleryStreamManager;
  }

  async setMediaGalleryStreamManager(
    _mediaGalleryStreamManager: MediaGalleryStreamManager
  ) {
    this.mediaGalleryStreamManager = _mediaGalleryStreamManager;
  }

  async createOrUpdateStream(content: MediaObject) {
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

    const streamId = this.getStreamId();
    if (streamId == null) {
      console.error(`MediaGalleryItemStreamManager.streamId does not exist`);
      return;
    }

    const prevState = this.mediaGalleryStreamManager.getStreamContent() ?? {
      mediaGalleryItems: [],
    };
    const prevItems = prevState["mediaGalleryItems"] ?? [];
    const newItems = prevItems.concat(streamId.toString());
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
    const prevItems: string[] = prevState["mediaGalleryItems"] ?? [];
    const newItems = prevItems.filter((item) => streamId.toString() != item);
    await this.mediaGalleryStreamManager.createOrUpdateStream({
      mediaGalleryItems: newItems,
    });

    // Unpin stream
    await this.ceramic.pin.rm(streamId);
  }
}

export function useMediaGalleryItemData(
  mediaGalleryStreamManager: MediaGalleryStreamManager,
  assetContentManager: AssetContentManager
) {
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
              assetContentManager,
              mediaGalleryStreamManager
            );
          _mediaGalleryItemStreamManager.stream = loadedItems[docId];
          result[docId] = _mediaGalleryItemStreamManager;
          return result;
        },
        {} as Record<string, MediaGalleryItemStreamManager>
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
