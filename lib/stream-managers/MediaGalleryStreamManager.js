import { TileStreamManager } from "./TileStreamManager";
import * as React from "react";

export class MediaGalleryStreamManager extends TileStreamManager {
  constructor(dataStore, controller) {
    super(dataStore.ceramic, null, controller);
    this.dataStore = dataStore;
  }

  async createOrUpdateStream(content) {
    console.log(content);
    await this.dataStore.set("mediaGallery", content, {
      controller: this._controller,
    });

    if (!this.stream) {
      this.stream = await this.dataStore.getRecordDocument(
        this.dataStore.getDefinitionID("mediaGallery"),
        this._controller
      );
    }

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

export function useMediaGalleryStreamManager(dataStore, didNFT) {
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
        dataStore,
        didNFT
      );

      const mediaGalleryStreamId = await dataStore.getRecordID(
        dataStore.getDefinitionID("mediaGallery"),
        didNFT
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
