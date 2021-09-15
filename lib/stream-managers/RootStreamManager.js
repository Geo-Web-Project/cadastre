import { TileStreamManager } from "./TileStreamManager";
import { CONTENT_ROOT_SCHEMA_STREAMID } from "../constants";
import * as React from "react";

export class RootStreamManager extends TileStreamManager {
  constructor(ceramic, controller) {
    super(ceramic, CONTENT_ROOT_SCHEMA_STREAMID, controller);
  }
}

export function useRootStreamManager(ceramic, didNFT) {
  const [parcelRootStreamManager, setRootStreamManager] = React.useState(null);

  React.useEffect(() => {
    if (ceramic == null) {
      console.error("Ceramic instance not found");
      return;
    }

    if (didNFT == null) {
      console.debug("didNFT not found");
      return;
    }

    const _parcelRootStreamManager = new RootStreamManager(ceramic, didNFT);
    setRootStreamManager(_parcelRootStreamManager);
  }, [ceramic, didNFT]);

  return parcelRootStreamManager;
}
