import { TileStreamManager } from "./TileStreamManager";
import { MEDIA_GALLERY_SCHEMA_DOCID } from "../constants";
import * as React from "react";

export class MediaGalleryStreamManager extends TileStreamManager {
  constructor(ceramic, _rootStreamManager) {
    super(ceramic, MEDIA_GALLERY_SCHEMA_DOCID);
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
        mediaGallery: newStreamId,
      });
    }

    return newStreamId;
  }
}

export function useMediaGalleryStreamManager(parcelRootStreamManager) {
  const [
    mediaGalleryStreamManager,
    setMediaGalleryStreamManager,
  ] = React.useState(null);

  const parcelContent = parcelRootStreamManager
    ? parcelRootStreamManager.getStreamContent()
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
    if (!parcelRootStreamManager || mediaGalleryStreamManager) {
      return;
    }

    const _mediaGalleryStreamManager = new MediaGalleryStreamManager(
      parcelRootStreamManager.ceramic
    );
    _mediaGalleryStreamManager.setRootStreamManager(parcelRootStreamManager);
    setMediaGalleryStreamManager(_mediaGalleryStreamManager);
  });

  return mediaGalleryStreamManager;
}
