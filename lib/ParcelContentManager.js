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

  /* Update root stream content or create one if it doesn't exist */
  async createOrUpdateRootStream(content) {
    if (this.rootStream) {
      await this.rootStream.change({
        content: { ...content, ...this.rootStream.content },
      });
    } else {
      this.rootStream = await this.ceramic.createDocument("tile", {
        content: content,
        metadata: {
          schema: CONTENT_ROOT_SCHEMA_DOCID,
        },
      });
    }
  }
}
