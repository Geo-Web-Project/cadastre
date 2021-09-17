import { TileStreamManager } from "./TileStreamManager";
import { MEDIA_GALLERY_SCHEMA_STREAMID } from "../constants";
import * as React from "react";

export class MediaGalleryStreamManager extends TileStreamManager {
  constructor(ceramic, _rootStreamManager, controller) {
    super(ceramic, MEDIA_GALLERY_SCHEMA_STREAMID, controller);
    this.rootStreamManager = null;
  }

  async setRootStreamManager(_rootStreamManager) {
    this.rootStreamManager = _rootStreamManager;
  }

  async createOrUpdateStream(content) {
    const newStreamId = await super.createOrUpdateStream(content);
    if (newStreamId) {
      // Update link to root stream
      await this.rootStreamManager.createOrUpdateStream({
        mediaGallery: newStreamId.toString(),
      });
    }

    return newStreamId;
  }

  // Load all items with a multi query
  async loadItems() {
    const mediaGalleryContent = this.getStreamContent();
    if (!mediaGalleryContent) {
      return {};
    }

    const queries = mediaGalleryContent.map((streamId) => {
      return { streamId: streamId, paths: [] };
    });
    return await this.ceramic.multiQuery(queries);
  }
}

export function useMediaGalleryStreamManager(parcelIndexManager) {
  const [mediaGalleryStreamManager, setMediaGalleryStreamManager] =
    React.useState(null);

  const parcelContent = parcelIndexManager
    ? parcelIndexManager.getStreamContent()
    : null;

  const mediaGallery = parcelContent ? parcelContent.mediaGallery : null;

  // Observe changes to media gallery stream ID
  React.useEffect(() => {
    if (!mediaGalleryStreamManager) {
      return;
    }

    async function updateStreamId() {
      await mediaGalleryStreamManager.setExistingStreamId(mediaGallery);
    }

    updateStreamId();
  }, [mediaGallery]);

  React.useEffect(() => {
    if (!parcelIndexManager || mediaGalleryStreamManager) {
      return;
    }

    const _mediaGalleryStreamManager = new MediaGalleryStreamManager(
      parcelIndexManager.ceramic
    );
    _mediaGalleryStreamManager.setRootStreamManager(parcelIndexManager);
    setMediaGalleryStreamManager(_mediaGalleryStreamManager);
  });

  return mediaGalleryStreamManager;
}
