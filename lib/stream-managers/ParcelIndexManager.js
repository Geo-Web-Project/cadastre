import { TileStreamManager } from "./TileStreamManager";
import { CIP11_INDEX_SCHEMA_URL } from "@glazed/constants";
import { DIDDataStore } from "@glazed/did-datastore";
import { publishedModel } from "../constants";
import { TileDocument } from "@ceramicnetwork/stream-tile";
import BN from "bn.js";
import { createNftDidUrl } from "nft-did-resolver";
import { NETWORK_ID } from "../constants";

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
    const _stream = await this.dataStore._createIDXDoc(this._controller);
    this.stream = await TileDocument.load(this.ceramic, _stream.id);
  }

  async createOrUpdateStream(content, controller) {
    if (this.stream) {
      await this.updateStream(content);
    } else {
      this.stream = await this.dataStore._createIDXDoc(
        controller ?? this._controller
      );
      await this.updateStream(content, { schema: this._schemaStreamId });
      if (this._shouldPin) {
        await this.ceramic.pin.add(this.stream.id);
      }
      return this.stream.id;
    }
  }

  getIndex() {
    return this.getStreamContent();
  }

  async set(key, content, options) {
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
    const index = this.getIndex();
    const existing = index[definitionID];
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

export function useParcelIndexManager(
  ceramic,
  adminContract,
  selectedParcelId
) {
  const [parcelIndexManager, setParcelIndexManager] = React.useState(null);

  React.useEffect(() => {
    if (ceramic == null) {
      console.error("Ceramic instance not found");
      return;
    }

    setParcelIndexManager(null);

    async function updateParcelIndexManager() {
      const licenseAddress = await adminContract.licenseContract();

      if (selectedParcelId) {
        const didNFT = createNftDidUrl({
          chainId: `eip155:${NETWORK_ID}`,
          namespace: "erc721",
          contract: licenseAddress.toLowerCase(),
          tokenId: new BN(selectedParcelId.slice(2), "hex").toString(10),
        });

        const dataStore = new DIDDataStore({ ceramic, model: publishedModel });

        const _parcelIndexManager = new ParcelIndexManager(ceramic, dataStore);
        await _parcelIndexManager.setController(didNFT);
        setParcelIndexManager(_parcelIndexManager);
      } else {
        setParcelIndexManager(null);
      }
    }

    updateParcelIndexManager();
  }, [ceramic, selectedParcelId, adminContract]);

  return parcelIndexManager;
}
