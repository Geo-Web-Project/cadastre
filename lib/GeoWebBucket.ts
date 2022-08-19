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
import { default as axios } from "axios";

export class GeoWebBucket extends TileStreamManager<Pinset> {
  assetContentManager: AssetContentManager;
  bucketRoot?: CID | null;
  latestQueuedLinks?: CID[];
  latestPinnedLinks?: CID[];
  private _ipfs: IPFS;
  private web3Storage = new Web3Storage({
    token: process.env.NEXT_PUBLIC_WEB3_STORAGE_TOKEN ?? "",
    endpoint: new URL("https://api.web3.storage"),
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
      setTimeout(resolve, 3000, null);
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
      console.warn(`Could not find pinset locally: ${this.bucketRoot}`);
      console.debug(`Fetching CAR from Web3.storage: ${this.bucketRoot}`);
      const carResponse = await axios.get(
        `https://api.web3.storage/car/${this.bucketRoot!.toString()}`,
        { responseType: "blob" }
      );
      console.debug(`Importing CAR from Web3.storage: ${this.bucketRoot}`);
      const data = carResponse.data as Blob;
      const buffer = await data.arrayBuffer();
      const uintBuffer = new Uint8Array(buffer);
      this._ipfs.dag.import(
        (async function* () {
          yield uintBuffer;
        })()
      );
      console.debug(`Finding links for latest pinset: ${this.bucketRoot}`);
      const _latestQueuedLinks = await this._ipfs.object.links(
        this.bucketRoot!
      );
      this.latestQueuedLinks = _latestQueuedLinks.map((l) => l.Hash);
      console.debug(`Found latestQueuedLinks: ${this.latestQueuedLinks}`);
      return;
    }

    let result;
    try {
      const isPinned = await this.checkWeb3Storage();
      if (isPinned) {
        this.latestPinnedLinks = this.latestQueuedLinks;
      } else {
        this.triggerPin();
      }
    } catch (err) {
      return;
    }

    const latestPinnedRootStr = localStorage.getItem(this.localPinsetKey());
    const latestPinnedRoot = latestPinnedRootStr
      ? CID.parse(latestPinnedRootStr)
      : undefined;

    if (latestPinnedRoot) {
      console.debug(
        `Finding links for latest pinned pinset: ${latestPinnedRoot}`
      );
      this.latestPinnedLinks = (
        await this._ipfs.object.links(latestPinnedRoot)
      ).map((l) => l.Hash);
      console.debug(`Found latestPinnedLinks: ${this.latestPinnedLinks}`);
    }
  }

  private localPinsetKey() {
    return `latestPinset:${this.assetContentManager.assetId.toString()}`;
  }

  private async checkWeb3Storage(): Promise<boolean> {
    const result = await this.web3Storage.status(this.bucketRoot!.toString());
    const isPinned = result ? result.pins.length > 0 : false;

    if (isPinned) {
      localStorage.setItem(this.localPinsetKey(), this.bucketRoot!.toString());
    }
    return isPinned;
  }

  async triggerPin() {
    const car = await this._ipfs.dag.export(this.bucketRoot!);
    const reader = await CarReader.fromIterable(car);
    await this.web3Storage.putCar(reader);
    this.fetchLatestPinset();

    // Poll status async
    await new Promise<void>((resolve, reject) => {
      let timeout = 5000;
      const poll = async () => {
        const isPinned = await this.checkWeb3Storage();

        if (isPinned) {
          this.latestPinnedLinks = this.latestQueuedLinks;
          resolve();
        } else {
          setTimeout(async () => await poll(), timeout);
          timeout = timeout * 1.5;
        }
      };

      poll();
    });
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
