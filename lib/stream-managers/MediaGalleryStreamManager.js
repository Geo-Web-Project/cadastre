import { TileStreamManager } from "./TileStreamManager";
import * as React from "react";

export class MediaGalleryStreamManager extends TileStreamManager {
  constructor(_parcelIndexManager) {
    super(_parcelIndexManager.ceramic, null, _parcelIndexManager._controller);
    this.parcelIndexManager = _parcelIndexManager;
  }

  async createOrUpdateStream(content) {
    this.stream = await this.parcelIndexManager.set("mediaGallery", content);
    return this.stream.id;
  }

  async updateStream(content) {
    return this.createOrUpdateStream(content);
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

  const index = parcelIndexManager
    ? parcelIndexManager.getStreamContent()
    : null;

  const mediaGalleryStreamId = index
    ? index[parcelIndexManager.dataStore.getDefinitionID("mediaGallery")]
    : null;

  // Observe changes to media gallery stream ID
  React.useEffect(() => {
    if (!mediaGalleryStreamManager) {
      return;
    }

    async function updateStreamId() {
      await mediaGalleryStreamManager.setExistingStreamId(mediaGalleryStreamId);
    }

    updateStreamId();
  }, [mediaGalleryStreamId]);

  React.useEffect(() => {
    if (!parcelIndexManager || mediaGalleryStreamManager) {
      return;
    }

    const _mediaGalleryStreamManager = new MediaGalleryStreamManager(
      parcelIndexManager
    );
    setMediaGalleryStreamManager(_mediaGalleryStreamManager);
  });

  return mediaGalleryStreamManager;
}
