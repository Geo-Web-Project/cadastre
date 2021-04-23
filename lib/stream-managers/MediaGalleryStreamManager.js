import { TileStreamManager } from "./TileStreamManager";
import { MEDIA_GALLERY_SCHEMA_DOCID } from "../constants";

export class MediaGalleryStreamManager extends TileStreamManager {
  constructor(ceramic, _rootStreamManager) {
    super(ceramic, MEDIA_GALLERY_SCHEMA_DOCID);
    this.rootStreamManager = null;
  }

  async setRootStreamManager(_rootStreamManager) {
    this.rootStreamManager = _rootStreamManager;
    this.rootStreamManager.addObserver();
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

  async observeRootStream() {
    // Check for existing stream ID
    const rootStreamContent = this.rootStreamManager.getStreamContent();
    if (!rootStreamContent) {
      return;
    }

    const existingStreamId = rootStreamContent.mediaGallery;
    if (!existingStreamId) {
      return;
    }

    await this.setExistingStreamId(existingStreamId);
  }
}
