import { TileStreamManager } from "./TileStreamManager";
import { CONTENT_ROOT_SCHEMA_STREAMID } from "../constants";
import * as React from "react";

export class RootStreamManager extends TileStreamManager {
  constructor(ceramic) {
    super(ceramic, CONTENT_ROOT_SCHEMA_STREAMID);
  }
}

export function useRootStreamManager(ceramic) {
  const [parcelRootStreamManager, setRootStreamManager] = React.useState(null);

  React.useEffect(() => {
    if (ceramic == null) {
      console.error("Ceramic instance not found");
      return;
    }

    const _parcelRootStreamManager = new RootStreamManager(ceramic);
    setRootStreamManager(_parcelRootStreamManager);
  }, [ceramic]);

  return parcelRootStreamManager;
}
