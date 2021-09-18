import { TileStreamManager } from "./TileStreamManager";
import { CIP11_INDEX_SCHEMA_URL } from "@glazed/constants";
import { DIDDataStore } from "@glazed/did-datastore";
import { publishedModel } from "../constants";
import { TileDocument } from "@ceramicnetwork/stream-tile";

import * as React from "react";

export class ParcelIndexManager extends TileStreamManager {
  constructor(ceramic, dataStore) {
    super(ceramic, CIP11_INDEX_SCHEMA_URL, null);
    this.dataStore = dataStore;
  }

  async setController(controller) {
    this._controller = controller;
    if (this._controller == null) {
      this.stream = null;
      return;
    }
    const _stream = await TileDocument.create(
      this.ceramic,
      null,
      {
        schema: this._schemaStreamId,
        controllers: [this._controller],
        deterministic: true,
        family: "IDX",
      },
      { anchor: false, publish: false }
    );
    this.stream = await TileDocument.load(this.ceramic, _stream.id);
  }

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
          family: "IDX",
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

  async get(key) {
    return await this.dataStore.get(key, this._controller);
  }

  async getIndex() {
    return await this.dataStore.getIndex(this._controller);
  }

  async set(key, content, options) {
    console.log(`SET ${key} on ${this.stream.id}`);
    const definitionID = this.dataStore.getDefinitionID(key);
    const [created, stream] = await this._setRecordOnly(
      definitionID,
      content,
      options
    );
    if (created) {
      await this._setReference(definitionID, stream.id);
    }
    return stream;
  }

  async _createRecord(definition, content) {
    const doc = await TileDocument.create(this.ceramic, content, {
      controllers: [this._controller],
      family: definition.id.toString(),
      schema: definition.schema,
    });
    if (this._shouldPin) {
      await this.ceramic.pin.add(doc.id);
    }
    return doc;
  }

  async _setRecordOnly(definitionID, content, options) {
    const existing = await this.dataStore.getRecordID(
      definitionID,
      this._controller
    );
    if (existing == null) {
      const definition = await this.dataStore.getDefinition(definitionID);
      const ref = await this._createRecord(definition, content, options);
      return [true, ref];
    } else {
      const doc = await this.dataStore._loadDocument(existing);
      await doc.update(content);
      return [false, doc];
    }
  }

  async _setReference(definitionID, id) {
    await this.createOrUpdateStream({ [definitionID]: id.toUrl() });
  }
}

export function useParcelIndexManager(ceramic) {
  const [parcelIndexManager, setParcelIndexManager] = React.useState(null);

  React.useEffect(() => {
    if (ceramic == null) {
      console.error("Ceramic instance not found");
      return;
    }

    const dataStore = new DIDDataStore({ ceramic, model: publishedModel });

    const _parcelIndexManager = new ParcelIndexManager(ceramic, dataStore);
    setParcelIndexManager(_parcelIndexManager);
  }, [ceramic]);

  return parcelIndexManager;
}
