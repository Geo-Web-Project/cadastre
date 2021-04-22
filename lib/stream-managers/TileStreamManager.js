export class TileStreamManager {
  constructor(ceramic, schemaStreamId) {
    this.ceramic = ceramic;
    this._schemaStreamId = schemaStreamId;
  }

  /* Set an existing root stream ID */
  async setExistingStreamId(streamId) {
    this.stream = await this.ceramic.loadDocument(streamId);
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
      this.stream = await this.ceramic.createDocument("tile", {
        content: content,
        metadata: {
          schema: this._schemaStreamId,
        },
      });
      return this.stream.id;
    }
  }

  async updateStream(content) {
    if (!this.stream) {
      console.error("Stream does not exist");
      return;
    }
    await this.stream.change({
      content: { ...this.stream.content, ...content },
    });
  }

  _isOwnerOfStream() {
    return this.stream
      ? this.stream.controllers.includes(this.ceramic.did.id)
      : null;
  }
}
