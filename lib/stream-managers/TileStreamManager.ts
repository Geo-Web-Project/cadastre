/* eslint-disable import/named */
import { CeramicApi } from "@ceramicnetwork/common";
import { TileDocument, TileMetadataArgs } from "@ceramicnetwork/stream-tile";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TileStreamManager<T = Record<string, any>> {
  ceramic: CeramicApi;
  stream?: TileDocument<T> | null;
  private _schemaStreamId?: string;
  private _shouldPin: boolean;
  protected _controller: string;

  constructor(
    ceramic: CeramicApi,
    schemaStreamId: string | null,
    controller: string
  ) {
    this.ceramic = ceramic;
    this._schemaStreamId = schemaStreamId ?? undefined;
    this._shouldPin = true;
    this._controller = controller;
  }

  /* Set an existing root stream ID */
  async setExistingStreamId(streamId: string | null) {
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
  async createOrUpdateStream(
    content: T,
    controller: string,
    deterministic: boolean
  ) {
    if (this.stream) {
      await this.updateStream(content);
    } else {
      this.stream = await TileDocument.create<T>(
        this.ceramic,
        null,
        {
          schema: this._schemaStreamId,
          controllers: [controller ?? this._controller],
          deterministic: deterministic ?? true,
        },
        { anchor: false, publish: false }
      );
      await this.updateStream(content);
      if (this._shouldPin) {
        await this.ceramic.pin.add(this.stream.id);
      }
      return this.stream.id.toString();
    }
  }

  async updateStream(content: T, metadata?: TileMetadataArgs) {
    if (!this.stream) {
      console.error("Stream does not exist");
      return;
    }

    if (Array.isArray(content)) {
      await this.stream.update(content, metadata);
    } else {
      await this.stream.update(
        { ...this.stream.content, ...content },
        metadata
      );
    }
  }
}
