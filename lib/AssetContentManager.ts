/* eslint-disable import/named */
import { CeramicApi } from "@ceramicnetwork/common";
import { TileDocument } from "@ceramicnetwork/stream-tile";
import { ModelTypes } from "@geo-web/datamodels";
import { DataModel } from "@glazed/datamodel";
import { DefinitionContentType } from "@glazed/did-datastore";
import { AssetId } from "caip";

export class AssetContentManager<
  Alias extends keyof ModelTypes["definitions"] = keyof ModelTypes["definitions"]
> {
  ceramic: CeramicApi;
  model: DataModel<ModelTypes>;
  controller: string;
  assetId: AssetId;

  constructor(
    _ceramic: CeramicApi,
    _model: DataModel<ModelTypes>,
    _controller: string,
    _assetId: AssetId
  ) {
    this.ceramic = _ceramic;
    this.model = _model;
    this.controller = _controller;
    this.assetId = _assetId;
  }

  async set<
    Key extends Alias,
    ContentType = DefinitionContentType<ModelTypes, Key>
  >(key: Key, content: ContentType): Promise<string> {
    const record = await this.getRecord<Key, ContentType>(key);
    await record.update(content);

    return record.id.toString();
  }

  async getRecord<
    Key extends Alias,
    ContentType = DefinitionContentType<ModelTypes, Key>
  >(key: Key): Promise<TileDocument<ContentType>> {
    return await TileDocument.deterministic(this.ceramic, {
      controllers: [this.controller],
      family: `geoweb:${this.assetId.toString()}:${this.model.getDefinitionID(
        key
      )}`,
    });
  }
}
