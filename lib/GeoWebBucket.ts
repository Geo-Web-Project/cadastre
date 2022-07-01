/* eslint-disable import/no-unresolved */
/* 
    Interact with Geo Web Pinset
    - Store CIDs in a UnixFs tree
    - Store root CID in Geo Web Pinset IDX index
    - Trigger Geo Web service to fetch latest pinset from DID
*/

import { STORAGE_WORKER_ENDPOINT } from "./constants";
import { TileStreamManager } from "./stream-managers/TileStreamManager";
import axios from "axios";
import { Pinset } from "@geo-web/datamodels";
import { AssetContentManager } from "./AssetContentManager";

export class GeoWebBucket extends TileStreamManager<Pinset> {
  assetContentManager: AssetContentManager;
  latestQueuedLinks?: string[];
  latestPinnedLinks?: string[];

  constructor(_assetContentManager: AssetContentManager) {
    super(
      _assetContentManager.ceramic,
      _assetContentManager.model.getSchemaURL("Pinset"),
      _assetContentManager.controller
    );
    this.assetContentManager = _assetContentManager;
  }

  async createOrUpdateStream(content: Pinset) {
    const newStreamId = await this.assetContentManager.set(
      "geoWebPinset",
      content
    );

    if (!this.stream) {
      this.stream = await this.assetContentManager.getRecord("geoWebPinset");
    }

    return newStreamId;
  }

  async updateStream(content: Pinset) {
    this.createOrUpdateStream(content);
  }

  /* Check for existing bucket or provision a new one */
  async fetchOrProvisionBucket(queueDidFail?: (err: Error) => void) {
    const pinsetIndex = this.getStreamContent();
    if (pinsetIndex) {
      this.latestQueuedLinks = pinsetIndex.items ?? [];
      console.debug(`Found latestQueuedLinks: ${this.latestQueuedLinks}`);
      this.latestPinnedLinks = await this.fetchLatestPinset();

      if (
        difference(
          new Set(this.latestQueuedLinks),
          new Set(this.latestPinnedLinks)
        ).size > 0
      ) {
        this.triggerPin().catch((err) => {
          if (queueDidFail) queueDidFail(err);
        });
      }
    } else {
      this.latestQueuedLinks = [];
      this.latestPinnedLinks = [];
    }
  }

  async reset() {
    console.debug(`Resetting pinset...`);

    await this.createOrUpdateStream({
      items: [],
    });

    await this.fetchOrProvisionBucket();

    console.debug(`Pinset is reset.`);
  }

  async fetchLatestPinset() {
    let result;
    try {
      result = await axios.get(
        `${STORAGE_WORKER_ENDPOINT}/dids/${
          this._controller
        }/assets/${this.assetContentManager.assetId
          .toString()
          .replaceAll("/", "_")}/collection`
      );
    } catch (err) {
      return undefined;
    }

    this.latestPinnedLinks = result.data.items ?? [];
    console.debug(`Found latestPinnedLinks: ${this.latestPinnedLinks}`);
    return this.latestPinnedLinks;
  }

  async triggerPin() {
    const result = await axios.post(
      `${STORAGE_WORKER_ENDPOINT}/dids/${
        this._controller
      }/assets/${this.assetContentManager.assetId
        .toString()
        .replaceAll("/", "_")}/collection`,
      { pinsetRecordId: this.stream!.commitId.toString() },
      { headers: { "Content-Type": "application/json" } }
    );

    if (result.status == 202) {
      this.fetchLatestPinset();
      return;
    } else {
      throw new Error("Trigger pin failed");
    }
  }

  async addCid(name: string, cid: string) {
    const existingLinks = this.latestPinnedLinks ?? [];
    if (existingLinks.filter((v) => v == cid).length > 0) {
      console.debug(`Link is already in pinset: ${name}`);
      return;
    }
    existingLinks.push(cid);

    await this.createOrUpdateStream({
      items: existingLinks,
    });
  }

  async removeCid(cid: string) {
    const existingLinks = this.latestPinnedLinks ?? [];
    await this.createOrUpdateStream({
      items: existingLinks.filter((v) => v != cid),
    });
  }

  /* Check if certain object is pinned */
  isPinned(cid: string) {
    if (!this.latestPinnedLinks) {
      return false;
    }

    return this.latestPinnedLinks.filter((v) => v === cid).length > 0;
  }

  /* Check if certain object is queued in latest pinset in IDX index */
  isQueued(cid: string) {
    if (!this.latestQueuedLinks) {
      return false;
    }

    return this.latestQueuedLinks.filter((v) => v === cid).length > 0;
  }

  async getBucketLink() {
    return "";
  }
}

function difference<T>(setA: Set<T>, setB: Set<T>) {
  const diff = new Set(setA);

  for (const elem of setB) {
    diff.delete(elem);
  }

  return diff;
}
