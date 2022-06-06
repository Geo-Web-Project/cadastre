/* eslint-disable import/no-unresolved */
/* 
    Interact with Geo Web Pinset
    - Store CIDs in a UnixFs tree
    - Store root CID in Geo Web Pinset IDX index
    - Trigger Geo Web service to fetch latest pinset from DID
*/

import { STORAGE_WORKER_ENDPOINT } from "./constants";
import { TileStreamManager } from "./stream-managers/TileStreamManager";
import CID from "cids";
import axios from "axios";
import { IPFS } from "ipfs-core";
import { DAGLink } from "ipld-dag-pb";
import { Pinset } from "@geo-web/datamodels";
import { AssetContentManager } from "./AssetContentManager";

export class GeoWebBucket extends TileStreamManager<Pinset> {
  assetContentManager: AssetContentManager;
  bucketRoot?: CID;
  latestQueuedLinks?: any[];
  latestPinnedLinks?: any[];
  latestPinnedRoot?: CID;
  private _ipfs: IPFS;

  constructor(_assetContentManager: AssetContentManager, ipfs: IPFS) {
    super(
      _assetContentManager.ceramic,
      _assetContentManager.model.getSchemaURL("Pinset"),
      _assetContentManager.controller
    );
    this.assetContentManager = _assetContentManager;
    this._ipfs = ipfs;
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
      this.bucketRoot = new CID(pinsetIndex.root.split("ipfs://")[1]);
      await this.fetchLatestPinset();
      if (this.latestQueuedLinks) {
        this.triggerPin().catch((err) => {
          if (queueDidFail) queueDidFail(err);
        });
      }
    } else {
      this.bucketRoot = await this._ipfs.object.new({
        template: "unixfs-dir",
      });
      this.latestQueuedLinks = await this._ipfs.object.links(this.bucketRoot);
    }
  }

  async reset() {
    console.debug(`Resetting pinset...`);

    // Update IDX index
    const emptyPinset = await this._ipfs.object.new({
      template: "unixfs-dir",
    });
    await this.createOrUpdateStream({
      root: `ipfs://${emptyPinset.toString()}`,
    });

    await this.fetchOrProvisionBucket();

    console.debug(`Pinset is reset.`);
  }

  async fetchLatestPinset() {
    // Check if pinset can be found
    const fetchLinksP = this._ipfs.object.links(this.bucketRoot!);
    const timeoutP = new Promise((resolve, reject) => {
      setTimeout(resolve, 60000, null);
    });
    console.debug(`Finding links for latest pinset: ${this.bucketRoot}`);
    const _latestQueuedLinks = (await Promise.race([
      fetchLinksP,
      timeoutP,
    ])) as any[];
    if (_latestQueuedLinks) {
      // Found
      this.latestQueuedLinks = _latestQueuedLinks;
      console.debug(`Found latestQueuedLinks: ${this.latestQueuedLinks}`);
    } else {
      // Not found after timeout
      console.warn(`Could not find pinset: ${this.bucketRoot}`);
      this.latestQueuedLinks = undefined;
      return;
    }

    let result;
    try {
      result = await axios.get(
        `${STORAGE_WORKER_ENDPOINT}/pinset/${
          this._controller
        }/latest?assetId=${this.assetContentManager.assetId.toString()}`
      );
    } catch (err) {
      return;
    }

    const latestCommitId = result.data.latestCommitId;
    const pinsetStream = await this.ceramic.loadStream(latestCommitId);
    this.latestPinnedRoot = new CID(
      pinsetStream.content.root.split("ipfs://")[1]
    );

    console.debug(
      `Finding links for latest pinned pinset: ${this.latestPinnedRoot}`
    );
    this.latestPinnedLinks = await this._ipfs.object.links(
      this.latestPinnedRoot
    );
    console.debug(`Found latestPinnedLinks: ${this.latestPinnedLinks}`);
  }

  async triggerPin() {
    // Manual preload
    await this._ipfs.preload(this.bucketRoot!);

    const result = await axios.post(
      `${STORAGE_WORKER_ENDPOINT}/pinset/${
        this._controller
      }/request?assetId=${this.assetContentManager.assetId.toString()}`,
      { pinsetRecordID: this.stream!.commitId.toString() },
      { headers: { "Content-Type": "application/json" } }
    );

    if (result.data.status == "pinned") {
      this.fetchLatestPinset();
      return;
    } else if (result.data.status == "failed") {
      throw new Error("Trigger pin failed");
    }

    // Poll status async
    await new Promise<void>((resolve, reject) => {
      let timeout = 1000;
      const poll = async () => {
        const pollResult = await axios.get(
          `${STORAGE_WORKER_ENDPOINT}/pinset/${
            this._controller
          }/request/${this.stream!.commitId.toString()}?assetId=${this.assetContentManager.assetId.toString()}`
        );

        if (pollResult.data.status == "pinned") {
          this.fetchLatestPinset();
          resolve();
        } else if (pollResult.data.status == "failed") {
          reject();
        } else {
          setTimeout(async () => await poll(), timeout);
          timeout = timeout * 1.5;
        }
      };

      poll();
    });
  }

  async addCid(name: string, cid: string) {
    // Check existing links
    const cidObject = new CID(cid);
    const existingLinks = await this._ipfs.object.links(this.bucketRoot!);
    if (existingLinks.filter((v) => v.Name == name).length > 0) {
      console.debug(`Link is already in pinset: ${name}`);
      return;
    }
    // Patch object
    const objectStat = await this._ipfs.object.stat(cidObject);
    const link = new DAGLink(name, objectStat.CumulativeSize, cidObject);
    this.bucketRoot = await this._ipfs.object.patch.addLink(
      this.bucketRoot!,
      link
    );
    this.latestQueuedLinks = await this._ipfs.object.links(this.bucketRoot);

    // Update IDX index
    await this.createOrUpdateStream({
      root: `ipfs://${this.bucketRoot.toString()}`,
    });
  }

  async removeCid(name: string) {
    // Patch object
    this.bucketRoot = await this._ipfs.object.patch.rmLink(
      this.bucketRoot!,
      name
    );
    this.latestQueuedLinks = await this._ipfs.object.links(this.bucketRoot);

    // Update IDX index
    await this.createOrUpdateStream({
      root: `ipfs://${this.bucketRoot.toString()}`,
    });

    await this.triggerPin();
  }

  /* Check if certain object is pinned */
  isPinned(name: string) {
    if (!this.latestPinnedLinks) {
      return false;
    }

    return this.latestPinnedLinks.filter((v) => v.Name == name).length > 0;
  }

  /* Check if certain object is queued in latest pinset in IDX index */
  isQueued(name: string) {
    if (!this.latestQueuedLinks) {
      return false;
    }

    return this.latestQueuedLinks.filter((v) => v.Name == name).length > 0;
  }

  async getBucketLink() {
    return this.bucketRoot
      ? `https://dweb.link/ipfs/${this.bucketRoot.toString()}`
      : null;
  }

  // async listArchives() {
  //   return await this._buckets.archives(this._bucketRoot.key);
  // }
}
