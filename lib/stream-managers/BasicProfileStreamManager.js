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

  const index = parcelIndexManager
    ? parcelIndexManager.getStreamContent()
    : null;

  const basicProfileStreamId = index
    ? index[parcelIndexManager.dataStore.getDefinitionID("basicProfile")]
    : null;

  // Observe changes to basic profile stream ID
  React.useEffect(() => {
    if (!basicProfileStreamManager) {
      return;
    }

    async function updateStreamId() {
      await basicProfileStreamManager.setExistingStreamId(basicProfileStreamId);
    }

    updateStreamId();
  }, [basicProfileStreamId]);

  React.useEffect(() => {
    if (!parcelIndexManager || basicProfileStreamManager) {
      return;
    }

    const _basicProfileStreamManager = new BasicProfileStreamManager(
      parcelIndexManager
    );
    setBasicProfileStreamManager(_basicProfileStreamManager);
  }, [parcelIndexManager]);

  return basicProfileStreamManager;
}
