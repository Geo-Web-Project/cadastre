import { TileStreamManager } from "./TileStreamManager";
import * as React from "react";

export class MediaGalleryStreamManager extends TileStreamManager {
  constructor(dataStore) {
    super(dataStore.ceramic, null, dataStore.id);
    this.dataStore = dataStore;
  }

  async createOrUpdateStream(content) {
    this.stream = await this.dataStore.set("mediaGallery", content);
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

export function useMediaGalleryStreamManager(dataStore) {
  const [mediaGalleryStreamManager, setMediaGalleryStreamManager] =
    React.useState(null);

  React.useEffect(() => {
    if (!dataStore) {
      setMediaGalleryStreamManager(null);
      return;
    }

    setMediaGalleryStreamManager(null);

    async function setup() {
      const _mediaGalleryStreamManager = new MediaGalleryStreamManager(
        dataStore
      );

      const mediaGalleryStreamId = await dataStore.getRecordID(
        dataStore.getDefinitionID("mediaGallery")
      );

      console.debug(`Setting up mediaGallery: ${mediaGalleryStreamId}`);
      await _mediaGalleryStreamManager.setExistingStreamId(
        mediaGalleryStreamId
      );
      setMediaGalleryStreamManager(_mediaGalleryStreamManager);

      console.debug(`Setup mediaGallery complete.`);
    }

    setup();
  }, [dataStore]);

  return mediaGalleryStreamManager;
}
