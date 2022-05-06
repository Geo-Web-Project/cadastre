import { TileStreamManager } from "./TileStreamManager";
import * as React from "react";
import { DIDDataStore } from "@glazed/did-datastore";
import { BasicProfile, ModelTypes } from "@geo-web/datamodels";
import { StreamID } from "@ceramicnetwork/streamid";

export class BasicProfileStreamManager extends TileStreamManager<BasicProfile> {
  dataStore: DIDDataStore<ModelTypes>;

  constructor(dataStore: DIDDataStore, controller: string) {
    super(
      dataStore.ceramic,
      dataStore.model.getSchemaURL("BasicProfile")!,
      controller
    );
    this.dataStore = dataStore;
  }

  async createOrUpdateStream(content: BasicProfile) {
    const newStreamId = await this.dataStore.set("basicProfile", content, {
      controller: this._controller,
    });

    if (!this.stream) {
      this.stream = await this.dataStore.getRecord(
        this.dataStore.getDefinitionID("basicProfile"),
        this._controller
      );
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
    async function setup() {
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
    }

    setup();
  }, [dataStore]);

  return basicProfileStreamManager;
}
