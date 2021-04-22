/* 
    Content layer helpers and tooling
    - Manage root content stream
    - Load and create Ceramic streams
*/

import { CONTENT_ROOT_SCHEMA_DOCID } from "./constants";

export class ParcelContentManager {
  constructor(ceramic) {
    this.ceramic = ceramic;
  }

  /* Set an existing root stream ID */
  async setExistingRootStreamId(rootStreamId) {
    this.rootStream = await this.ceramic.loadDocument(rootStreamId);
  }

  /* Get root stream ID */
  getRootStreamId() {
    return this.rootStream ? this.rootStream.id : null;
  }

  /* Get root stream content */
  getRootStreamContent() {
    return this.rootStream ? this.rootStream.content : null;
  }

  /* 
    Update root stream content or create one if it doesn't exist OR is not owner
    Returns the new stream Id on creation
  */
  async createOrUpdateRootStream(content) {
    if (this.rootStream && this._isOwnerOfStream()) {
      await this.updateRootStream(content);
    } else {
      this.rootStream = await this.ceramic.createDocument("tile", {
        content: content,
        metadata: {
          schema: CONTENT_ROOT_SCHEMA_DOCID,
        },
      });
      return this.rootStream.id;
    }
  }

  async updateRootStream(content) {
    if (!this.rootStream) {
      console.error("Root stream does not exist");
      return;
    }
    await this.rootStream.change({
      content: { ...content, ...this.rootStream.content },
    });
  }

  _isOwnerOfStream() {
    return this.rootStream
      ? this.rootStream.controllers.includes(this.ceramic.did)
      : null;
  }
}
