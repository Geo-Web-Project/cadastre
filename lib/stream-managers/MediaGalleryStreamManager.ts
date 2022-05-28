/* eslint-disable import/no-unresolved */
import { TileStreamManager } from "./TileStreamManager";
import * as React from "react";
import { TileLoader } from "@glazed/tile-loader";
import { TileDocument } from "@ceramicnetwork/stream-tile";
import { MediaGallery } from "@geo-web/datamodels";
import { MediaObject } from "schema-org-ceramic/types/MediaObject.schema";
import { AssetContentManager } from "../AssetContentManager";

export class MediaGalleryStreamManager extends TileStreamManager<MediaGallery> {
  assetContentManager: AssetContentManager;

  constructor(_assetContentManager: AssetContentManager) {
    super(
      _assetContentManager.ceramic,
      _assetContentManager.model.getSchemaURL("MediaGallery"),
      _assetContentManager.controller
    );
    this.assetContentManager = _assetContentManager;
  }

  async createOrUpdateStream(content: MediaGallery) {
    const newStreamId = await this.assetContentManager.set(
      "mediaGallery",
      content
    );

    if (!this.stream) {
      this.stream = await this.assetContentManager.getRecord("mediaGallery");
    }

    return newStreamId;
  }

  async updateStream(content: MediaGallery) {
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
    }, {} as Record<string, TileDocument<MediaObject>>);
  }
}

export function useMediaGalleryStreamManager(
  assetContentManager: AssetContentManager | null
) {
  const [mediaGalleryStreamManager, setMediaGalleryStreamManager] =
    React.useState<MediaGalleryStreamManager | null>(null);

  React.useEffect(() => {
    setMediaGalleryStreamManager(null);

    async function setup() {
      if (!assetContentManager) {
        setMediaGalleryStreamManager(null);
        return;
      }

      const _mediaGalleryStreamManager = new MediaGalleryStreamManager(
        assetContentManager
      );

      const mediaGalleryStreamId = await assetContentManager.getRecordID(
        "mediaGallery"
      );

      console.debug(`Setting up mediaGallery: ${mediaGalleryStreamId}`);
      await _mediaGalleryStreamManager.setExistingStreamId(
        mediaGalleryStreamId
      );
      setMediaGalleryStreamManager(_mediaGalleryStreamManager);

      console.debug(`Setup mediaGallery complete.`);
    }

    setup();
  }, [assetContentManager]);

  return mediaGalleryStreamManager;
}
