import { TileStreamManager } from "./TileStreamManager";
import * as React from "react";

export class BasicProfileStreamManager extends TileStreamManager {
  constructor(dataStore) {
    super(dataStore.ceramic, null, dataStore.id);
    this.dataStore = dataStore;
  }

  async createOrUpdateStream(content) {
    this.stream = await this.dataStore.set("basicProfile", content);
    return this.stream.id;
  }

  async updateStream(content) {
    return this.createOrUpdateStream(content);
  }
}

export function useBasicProfileStreamManager(dataStore) {
  const [basicProfileStreamManager, setBasicProfileStreamManager] =
    React.useState(null);

  React.useEffect(() => {
    if (!dataStore) {
      setBasicProfileStreamManager(null);
      return;
    }

    setBasicProfileStreamManager(null);

    async function setup() {
      const _basicProfileStreamManager = new BasicProfileStreamManager(
        dataStore
      );

      const basicProfileStreamId = await dataStore.getRecordID(
        dataStore.getDefinitionID("basicProfile")
      );

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
