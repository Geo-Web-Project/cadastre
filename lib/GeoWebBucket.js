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
  }

  /* Check for existing bucket or provision a new one */
  async fetchOrProvisionBucket() {
    const pinsetIndex = await this._idx.get(IDX_PINSET_KEY);
    if (pinsetIndex) {
      this.bucketRoot = new CID(pinsetIndex.root.split("ipfs://")[1]);
    } else {
      this.bucketRoot = await this._ipfs.object.new({
        template: "unixfs-dir",
      });
    }

    this.triggerPin();
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
      return;
    }

    // Poll status
    await new Promise((resolve, reject) => {
      const poll = async () => {
        const pollResult = await axios.get(
          `${STORAGE_WORKER_ENDPOINT}/pinset/${
            this._idx.id
          }/request/${pinsetStream.commitId.toString()}`
        );

        if (pollResult.data.status == "pinned") {
          resolve();
        } else if (pollResult.data.status == "failed") {
          reject();
        } else {
          setTimeout(async () => await poll(), 1000);
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

    // Update IDX index
    await this._idx.set(IDX_PINSET_KEY, {
      root: `ipfs://${this.bucketRoot.toString()}`,
    });

    await this.triggerPin();
  }

  async removeCid(name) {
    // Patch object
    this.bucketRoot = await this._ipfs.object.patch.rmLink(this.bucketRoot, {
      name: name,
    });

    // Update IDX index
    await this._idx.set(IDX_PINSET_KEY, {
      root: `ipfs://${this.bucketRoot.toString()}`,
    });

    await this.triggerPin();
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
