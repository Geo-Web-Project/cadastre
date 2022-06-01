/* eslint-disable import/no-unresolved */
import { TileStreamManager } from "./TileStreamManager";
import * as React from "react";
import { BasicProfile } from "@geo-web/datamodels";
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
  assetContentManager: AssetContentManager | null
) {
  const [basicProfileStreamManager, setBasicProfileStreamManager] =
    React.useState<BasicProfileStreamManager | null>(null);

  React.useEffect(() => {
    (async () => {
      if (!assetContentManager) {
        setBasicProfileStreamManager(null);
        return;
      }

      setBasicProfileStreamManager(null);

      const _basicProfileStreamManager = new BasicProfileStreamManager(
        assetContentManager
      );

      const basicProfileStreamId = await assetContentManager.getRecordID(
        "basicProfile"
      );

      console.debug(`Setting up basicProfile: ${basicProfileStreamId}`);
      await _basicProfileStreamManager.setExistingStreamId(
        basicProfileStreamId
      );
      console.debug(`Setup basicProfile complete.`);

      setBasicProfileStreamManager(_basicProfileStreamManager);
    })();
  }, [assetContentManager]);

  return basicProfileStreamManager;
}
