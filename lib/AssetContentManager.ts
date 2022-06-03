/* eslint-disable import/named */
import { CeramicApi } from "@ceramicnetwork/common";
import { TileDocument } from "@ceramicnetwork/stream-tile";
import { ModelTypes } from "@geo-web/datamodels";
import { DataModel } from "@glazed/datamodel";
import { DefinitionContentType } from "@glazed/did-datastore";
import { AssetId } from "caip";

const IDX_INDEX_SCHEMA_ID =
  "k3y52l7qbv1fryjn62sggjh1lpn11c56qfofzmty190d62hwk1cal1c7qc5he54ow";

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
    const index = await this.getIndex();
    const definitionID = this.model.getDefinitionID(key);

    if (!definitionID) {
      throw new Error("Could not find definitionID");
    }

    if (index.content[definitionID]) {
      const record = await TileDocument.load(
        this.ceramic,
        index.content[definitionID]
      );
      await record.update(content);
      return record.id.toString();
    } else {
      const record = await TileDocument.create(this.ceramic, content, {
        controllers: [this.controller],
        family: `geoweb`,
      });

      await index.update({
        ...index.content,
        [definitionID]: `ceramic://${record.id.toString()}`,
      });

      return record.id.toString();
    }
  }

  async getRecordID<Key extends Alias>(key: Key): Promise<string> {
    const index = await this.getIndex();
    const definitionID = this.model.getDefinitionID(key);

    if (!definitionID) {
      throw new Error("Could not find definitionID");
    }

    return index.content[definitionID];
  }

  async getRecord<
    Key extends Alias,
    ContentType = DefinitionContentType<ModelTypes, Key>
  >(key: Key): Promise<TileDocument<ContentType>> {
    const recordId = await this.getRecordID(key);

    return await TileDocument.load(this.ceramic, recordId);
  }

  async getIndex(): Promise<TileDocument> {
    return await TileDocument.deterministic(this.ceramic, {
      controllers: [this.controller],
      schema: IDX_INDEX_SCHEMA_ID,
      family: `geoweb`,
      tags: [this.assetId.toString()],
    });
  }
}
