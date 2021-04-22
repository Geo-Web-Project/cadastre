import { TileStreamManager } from "./TileStreamManager";
import { CONTENT_ROOT_SCHEMA_DOCID } from "../constants";

export class RootStreamManager extends TileStreamManager {
  constructor(ceramic) {
    super(ceramic, CONTENT_ROOT_SCHEMA_DOCID);
  }
}
