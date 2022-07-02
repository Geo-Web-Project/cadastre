/* eslint-disable import/no-unresolved */
/* 
    Interact with Geo Web Pinset
    - Store CIDs in a UnixFs tree
    - Store root CID in Geo Web Pinset IDX index
    - Trigger Geo Web service to fetch latest pinset from DID
*/

import { TileStreamManager } from "./stream-managers/TileStreamManager";
import { CID } from "multiformats/cid";
import type { IPFS } from "ipfs-core-types";
import { createLink } from "@ipld/dag-pb";
import { Pinset } from "@geo-web/datamodels";
import { AssetContentManager } from "./AssetContentManager";
import { Web3Storage } from "web3.storage";
import { CarReader } from "@ipld/car";

export class GeoWebBucket extends TileStreamManager<Pinset> {
  assetContentManager: AssetContentManager;
  bucketRoot?: CID | null;
  latestQueuedLinks?: CID[];
  latestPinnedLinks?: CID[];
  private _ipfs: IPFS;
  private web3Storage = new Web3Storage({
    token: process.env.NEXT_PUBLIC_WEB3_STORAGE_TOKEN ?? "",
  });

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
    if (pinsetIndex && pinsetIndex.root) {
      this.bucketRoot = CID.parse(pinsetIndex.root.split("ipfs://")[1]);
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
      this.latestQueuedLinks = (
        await this._ipfs.object.links(this.bucketRoot)
      ).map((l) => l.Hash);
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
      this.latestQueuedLinks = _latestQueuedLinks.map((l) => l.Hash);
      console.debug(`Found latestQueuedLinks: ${this.latestQueuedLinks}`);
    } else {
      // Not found after timeout
      console.warn(`Could not find pinset: ${this.bucketRoot}`);
      this.latestQueuedLinks = undefined;
      return;
    }

    let result;
    try {
      result = await this.web3Storage.status(this.bucketRoot!.toString());
      const isPinned = result
        ? result.pins.filter((pin) => pin.status === "Pinned").length > 0
        : false;
      if (isPinned) {
        this.latestPinnedLinks = this.latestQueuedLinks;
      }
    } catch (err) {
      return;
    }
  }

  async triggerPin() {
    const car = await this._ipfs.dag.export(this.bucketRoot!);
    const reader = await CarReader.fromIterable(car);
    await this.web3Storage.putCar(reader);
    this.fetchLatestPinset();
  }

  async addCid(name: string, cid: CID) {
    // Check existing links
    const existingRoot = await this._ipfs.object.get(this.bucketRoot!);
    const existingLinks = await this._ipfs.object.links(this.bucketRoot!);
    if (existingLinks.filter((v) => v.Name == name).length > 0) {
      console.debug(`Link is already in pinset: ${name}`);
      return;
    }
    // Patch object
    const objectStat = await this._ipfs.object.stat(cid);
    const link = createLink(name, objectStat.CumulativeSize, cid);
    existingLinks.push(link);
    existingLinks.sort((a, b) => a.Name!.localeCompare(b.Name!));
    this.bucketRoot = await this._ipfs.object.put({
      ...existingRoot,
      Links: existingLinks,
    });

    this.latestQueuedLinks = (
      await this._ipfs.object.links(this.bucketRoot!)
    ).map((l) => l.Hash);

    // Update IDX index
    await this.createOrUpdateStream({
      root: `ipfs://${this.bucketRoot!.toString()}`,
    });
  }

  async removeCid(name: string) {
    // Patch object
    this.bucketRoot = await this._ipfs.object.patch.rmLink(
      this.bucketRoot!,
      name
    );
    this.latestQueuedLinks = (
      await this._ipfs.object.links(this.bucketRoot)
    ).map((l) => l.Hash);

    // Update IDX index
    await this.createOrUpdateStream({
      root: `ipfs://${this.bucketRoot!.toString()}`,
    });

    await this.triggerPin();
  }

  /* Check if certain object is pinned */
  isPinned(cid: CID) {
    if (!this.latestPinnedLinks) {
      return false;
    }

    return this.latestPinnedLinks.filter((v) => v.equals(cid)).length > 0;
  }

  /* Check if certain object is queued in latest pinset in IDX index */
  isQueued(cid: CID) {
    if (!this.latestQueuedLinks) {
      return false;
    }

    return this.latestQueuedLinks.filter((v) => v.equals(cid)).length > 0;
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
