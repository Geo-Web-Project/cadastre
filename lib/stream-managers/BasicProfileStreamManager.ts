/* eslint-disable import/no-unresolved */
import { TileStreamManager } from "./TileStreamManager";
import * as React from "react";
import { DIDDataStore } from "@glazed/did-datastore";
import { BasicProfile, ModelTypes } from "@geo-web/datamodels";
import { StreamID } from "@ceramicnetwork/streamid";
import { AssetContentManager } from "../AssetContentManager";

export class BasicProfileStreamManager extends TileStreamManager<BasicProfile> {
  assetContentManager: AssetContentManager;

  constructor(_assetContentManager: AssetContentManager) {
    super(
      _assetContentManager.ceramic,
      _assetContentManager.model.getSchemaURL("BasicProfile"),
      _assetContentManager.controller
    );
    this.assetContentManager = _assetContentManager;
  }

  async createOrUpdateStream(content: BasicProfile) {
    const newStreamId = await this.assetContentManager.set(
      "basicProfile",
      content
    );

    if (!this.stream) {
      this.stream = await this.assetContentManager.getRecord("basicProfile");
    }

    return newStreamId;
  }

  async updateStream(content: BasicProfile) {
    await this.createOrUpdateStream(content);
  }
}

export function useBasicProfileStreamManager(
  dataStore: DIDDataStore<ModelTypes> | null,
  didNFT: string | null
) {
  const [basicProfileStreamManager, setBasicProfileStreamManager] =
    React.useState<BasicProfileStreamManager | null>(null);

  React.useEffect(() => {
    (async () => {
      if (!dataStore || !didNFT) {
        setBasicProfileStreamManager(null);
        return;
      }

      setBasicProfileStreamManager(null);

      const _basicProfileStreamManager = new BasicProfileStreamManager(
        dataStore,
        didNFT
      );

      const basicProfileStreamIdString = await dataStore.getRecordID(
        dataStore.getDefinitionID("basicProfile"),
        didNFT
      );

      const basicProfileStreamId = basicProfileStreamIdString
        ? StreamID.fromString(basicProfileStreamIdString)
        : null;

      console.debug(`Setting up basicProfile: ${basicProfileStreamId}`);
      await _basicProfileStreamManager.setExistingStreamId(
        basicProfileStreamId
      );
      console.debug(`Setup basicProfile complete.`);

      setBasicProfileStreamManager(_basicProfileStreamManager);
    })();
  }, [dataStore]);

  return basicProfileStreamManager;
}
