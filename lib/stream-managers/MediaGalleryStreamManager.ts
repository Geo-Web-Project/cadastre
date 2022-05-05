import { TileStreamManager } from "./TileStreamManager";
import * as React from "react";
import { DIDDataStore } from "@glazed/did-datastore";
import { TileContent } from "@glazed/did-datastore/dist/proxy";
import { StreamID } from "@ceramicnetwork/streamid";
import { TileLoader } from "@glazed/tile-loader";
import { TileDocument } from "@ceramicnetwork/stream-tile";

export class MediaGalleryStreamManager extends TileStreamManager<TileContent> {
  dataStore: DIDDataStore;

  constructor(dataStore: DIDDataStore, controller: string) {
    super(
      dataStore.ceramic,
      dataStore.model.getSchemaURL("MediaGallery")!,
      controller
    );
    this.dataStore = dataStore;
  }

  async createOrUpdateStream(content: TileContent) {
    const newStreamId = await this.dataStore.set("mediaGallery", content, {
      controller: this._controller,
    });

    if (!this.stream) {
      this.stream = await this.dataStore.getRecordDocument(
        this.dataStore.getDefinitionID("mediaGallery"),
        this._controller
      );
    }

    return newStreamId;
  }

  async updateStream(content: TileContent) {
    this.createOrUpdateStream(content);
  }

  // Load all items with a multi query
  async loadItems() {
    const mediaGalleryContent = this.getStreamContent();
    if (!mediaGalleryContent) {
      return {};
    }

    const items: string[] = mediaGalleryContent["mediaGalleryItems"] ?? [];
    const loader = new TileLoader({ ceramic: this.ceramic });
    const streams = await Promise.all(items.map(loader.load));
    return streams.reduce((prev, cur) => {
      prev[cur.id.toString()] = cur;
      return prev;
    }, {} as Record<string, TileDocument<TileContent>>);
  }
}

export function useMediaGalleryStreamManager(
  dataStore: DIDDataStore | null,
  didNFT: string | null
) {
  const [mediaGalleryStreamManager, setMediaGalleryStreamManager] =
    React.useState<MediaGalleryStreamManager | null>(null);

  React.useEffect(() => {
    setMediaGalleryStreamManager(null);

    async function setup() {
      if (!dataStore || !didNFT) {
        setMediaGalleryStreamManager(null);
        return;
      }

      const _mediaGalleryStreamManager = new MediaGalleryStreamManager(
        dataStore,
        didNFT
      );

      const mediaGalleryStreamIdString = await dataStore.getRecordID(
        dataStore.getDefinitionID("mediaGallery"),
        didNFT
      );

      const mediaGalleryStreamId = mediaGalleryStreamIdString
        ? StreamID.fromString(mediaGalleryStreamIdString)
        : null;

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
