/* 
    Interact with Geo Web Pinset
    - Store CIDs in a UnixFs tree
    - Store root CID in Geo Web Pinset IDX index
    - Trigger Geo Web service to fetch latest pinset from DID
*/

import {
  IDX_PINSET_KEY,
  STORAGE_WORKER_ENDPOINT,
  IPFS_BOOTSTRAP_PEER,
} from "./constants";
import CID from "cids";
import StreamID from "@ceramicnetwork/streamid";
import axios from "axios";
const { Multiaddr } = require("multiaddr");

export class GeoWebBucket {
  constructor(idx, ipfs) {
    this._idx = idx;
    this._ipfs = ipfs;
    this.bucketRoot;
    this.latestQueuedLinks;
    this.latestPinnedRoot;
    this.latestPinnedLinks;
  }

  /* Check for existing bucket or provision a new one */
  async fetchOrProvisionBucket() {
    const pinsetIndex = await this._idx.get(IDX_PINSET_KEY);
    if (pinsetIndex) {
      this.bucketRoot = new CID(pinsetIndex.root.split("ipfs://")[1]);
      await this.fetchLatestPinset();
      if (this.latestQueuedLinks) {
        this.triggerPin();
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
    await this._idx.set(IDX_PINSET_KEY, {
      root: `ipfs://${emptyPinset.toString()}`,
    });

    await this.fetchOrProvisionBucket();

    console.debug(`Pinset is reset.`);
  }

  async fetchLatestPinset() {
    // Check if pinset can be found
    const fetchLinksP = this._ipfs.object.links(this.bucketRoot);
    const timeoutP = new Promise((resolve, reject) => {
      setTimeout(resolve, 60000, null);
    });
    console.debug(`Finding links for pinset: ${this.bucketRoot}`);
    const _latestQueuedLinks = await Promise.race([fetchLinksP, timeoutP]);
    if (_latestQueuedLinks) {
      // Found
      this.latestQueuedLinks = _latestQueuedLinks;
      console.debug(`Found latestQueuedLinks: ${this.latestQueuedLinks}`);
    } else {
      // Not found after timeout
      console.warn(`Could not find pinset: ${this.bucketRoot}`);
      this.latestQueuedLinks = null;
      return;
    }

    var result;
    try {
      result = await axios.get(
        `${STORAGE_WORKER_ENDPOINT}/pinset/${this._idx.id}/latest`
      );
    } catch (err) {
      return;
    }

    const latestCommitId = result.data.latestCommitId;
    const pinsetStream = await this._idx.ceramic.loadStream(latestCommitId);
    this.latestPinnedRoot = new CID(
      pinsetStream.content.root.split("ipfs://")[1]
    );
    this.latestPinnedLinks = await this._ipfs.object.links(
      this.latestPinnedRoot
    );
  }

  async triggerPin() {
    const index = await this._idx.getIndex();
    const pinsetRecordID = StreamID.fromString(index[IDX_PINSET_KEY]);
    const pinsetStream = await this._idx.ceramic.loadStream(pinsetRecordID);

    const result = await axios.post(
      `${STORAGE_WORKER_ENDPOINT}/pinset/${this._idx.id}/request`,
      { pinsetRecordID: pinsetStream.commitId.toString() },
      { headers: { "Content-Type": "application/json" } }
    );

    if (result.data.status == "pinned") {
      this.fetchLatestPinset();
      return;
    }

    // Poll status async
    await new Promise((resolve, reject) => {
      var timeout = 1000;
      const poll = async () => {
        const pollResult = await axios.get(
          `${STORAGE_WORKER_ENDPOINT}/pinset/${
            this._idx.id
          }/request/${pinsetStream.commitId.toString()}`
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

  async addCid(name, cid) {
    // Check existing links
    const cidObject = new CID(cid);
    const existingLinks = await this._ipfs.object.links(this.bucketRoot);
    if (existingLinks.filter((v) => v.Name == name).length > 0) {
      console.debug(`Link is already in pinset: ${name}`);
      return;
    }
    // Patch object
    const objectStat = await this._ipfs.object.stat(cid);
    this.bucketRoot = await this._ipfs.object.patch.addLink(this.bucketRoot, {
      name: name,
      cid: cidObject,
      size: objectStat.CumulativeSize,
    });
    this.latestQueuedLinks = await this._ipfs.object.links(this.bucketRoot);

    // Update IDX index
    await this._idx.set(IDX_PINSET_KEY, {
      root: `ipfs://${this.bucketRoot.toString()}`,
    });
  }

  async removeCid(name) {
    // Patch object
    this.bucketRoot = await this._ipfs.object.patch.rmLink(this.bucketRoot, {
      name: name,
    });
    this.latestQueuedLinks = await this._ipfs.object.links(this.bucketRoot);

    // Update IDX index
    await this._idx.set(IDX_PINSET_KEY, {
      root: `ipfs://${this.bucketRoot.toString()}`,
    });

    await this.triggerPin();
  }

  /* Check if certain object is pinned */
  isPinned(name) {
    if (!this.latestPinnedLinks) {
      return false;
    }

    return this.latestPinnedLinks.filter((v) => v.Name == name).length > 0;
  }

  /* Check if certain object is queued in latest pinset in IDX index */
  isQueued(name) {
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
