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

  React.useEffect(() => {
    if (!parcelIndexManager) {
      setMediaGalleryStreamManager(null);
      return;
    }

    setMediaGalleryStreamManager(null);

    async function setup() {
      const _mediaGalleryStreamManager = new MediaGalleryStreamManager(
        parcelIndexManager
      );
      const index = parcelIndexManager
        ? parcelIndexManager.getStreamContent()
        : null;

      const mediaGalleryStreamId = index
        ? index[parcelIndexManager.dataStore.getDefinitionID("mediaGallery")]
        : null;
      console.debug(`Setting up mediaGallery: ${mediaGalleryStreamId}`);
      await _mediaGalleryStreamManager.setExistingStreamId(
        mediaGalleryStreamId
      );
      setMediaGalleryStreamManager(_mediaGalleryStreamManager);

      console.debug(`Setup mediaGallery complete.`);
    }

    setup();
  }, [parcelIndexManager]);

  return mediaGalleryStreamManager;
}
