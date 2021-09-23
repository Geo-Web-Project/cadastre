import { TileDocument } from "@ceramicnetwork/stream-tile";

export class TileStreamManager {
  constructor(ceramic, schemaStreamId, controller) {
    this.ceramic = ceramic;
    this._schemaStreamId = schemaStreamId;
    this._shouldPin = true;
    this._controller = controller;
  }

  /* Set an existing root stream ID */
  async setExistingStreamId(streamId) {
    if (!streamId) {
      this.stream = null;
      return;
    }
    this.stream = await TileDocument.load(this.ceramic, streamId);
  }

  /* Get root stream ID */
  getStreamId() {
    return this.stream ? this.stream.id : null;
  }

  /* Get root stream content */
  getStreamContent() {
    return this.stream ? this.stream.content : null;
  }

  /* Get commit id */
  getCommitId() {
    return this.stream ? this.stream.commitId : null;
  }

  /* 
    Update root stream content or create one if it doesn't exist OR is not owner
    Returns the new stream Id on creation
  */
  async createOrUpdateStream(content, controller) {
    if (this.stream) {
      await this.updateStream(content);
    } else {
      this.stream = await TileDocument.create(
        this.ceramic,
        null,
        {
          schema: this._schemaStreamId,
          controllers: [controller ?? this._controller],
          deterministic: true,
        },
        { anchor: false, publish: false }
      );
      await this.updateStream(content);
      if (this._shouldPin) {
        await this.ceramic.pin.add(this.stream.id);
      }
      return this.stream.id;
    }
  }

  async updateStream(content, metadata) {
    if (!this.stream) {
      console.error("Stream does not exist");
      return;
    }

    if (Array.isArray(content)) {
      await this.stream.update(content);
    } else {
      await this.stream.update(
        { ...this.stream.content, ...content },
        metadata
      );
    }
  }
}
