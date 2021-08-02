import { TileDocument } from "@ceramicnetwork/stream-tile";

export class TileStreamManager {
  constructor(ceramic, schemaStreamId) {
    this.ceramic = ceramic;
    this._schemaStreamId = schemaStreamId;
    this._shouldPin = true;
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

  /* 
    Update root stream content or create one if it doesn't exist OR is not owner
    Returns the new stream Id on creation
  */
  async createOrUpdateStream(content) {
    if (this.stream && this._isOwnerOfStream()) {
      await this.updateStream(content);
    } else {
      this.stream = await TileDocument.create(this.ceramic, content, {
        schema: this._schemaStreamId,
      });
      if (this._shouldPin) {
        await this.ceramic.pin.add(this.stream.id);
      }
      return this.stream.id;
    }
  }

  async updateStream(content) {
    if (!this.stream) {
      console.error("Stream does not exist");
      return;
    }

    if (Array.isArray(content)) {
      await this.stream.update(content);
    } else {
      await this.stream.update({ ...this.stream.content, ...content });
    }
  }

  _isOwnerOfStream() {
    return this.stream
      ? this.stream.controllers.includes(this.ceramic.did.id)
      : null;
  }
}
