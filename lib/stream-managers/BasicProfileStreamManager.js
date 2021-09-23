import { TileStreamManager } from "./TileStreamManager";
import * as React from "react";

export class BasicProfileStreamManager extends TileStreamManager {
  constructor(_parcelIndexManager) {
    super(_parcelIndexManager.ceramic, null, _parcelIndexManager._controller);
    this.parcelIndexManager = _parcelIndexManager;
  }

  async createOrUpdateStream(content) {
    this.stream = await this.parcelIndexManager.set("basicProfile", content);
    return this.stream.id;
  }

  async updateStream(content) {
    return this.createOrUpdateStream(content);
  }
}

export function useBasicProfileStreamManager(parcelIndexManager) {
  const [basicProfileStreamManager, setBasicProfileStreamManager] =
    React.useState(null);

  React.useEffect(() => {
    if (!parcelIndexManager) {
      setBasicProfileStreamManager(null);
      return;
    }

    setBasicProfileStreamManager(null);

    async function setup() {
      const _basicProfileStreamManager = new BasicProfileStreamManager(
        parcelIndexManager
      );

      const index = parcelIndexManager
        ? parcelIndexManager.getStreamContent()
        : null;

      const basicProfileStreamId = index
        ? index[parcelIndexManager.dataStore.getDefinitionID("basicProfile")]
        : null;

      console.debug(`Setting up basicProfile: ${basicProfileStreamId}`);
      await _basicProfileStreamManager.setExistingStreamId(
        basicProfileStreamId
      );
      setBasicProfileStreamManager(_basicProfileStreamManager);

      console.debug(`Setup basicProfile complete.`);
    }

    setup();
  }, [parcelIndexManager]);

  return basicProfileStreamManager;
}
