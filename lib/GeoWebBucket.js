/* 
    Interact with Geo Web Pinset
    - Store CIDs in a UnixFs tree
    - Store root CID in Geo Web Pinset IDX index
    - Trigger Geo Web service to fetch latest pinset from DID
*/

import { IDX_PINSET_KEY, STORAGE_WORKER_ENDPOINT } from "./constants";
import CID from "cids";
import StreamID from "@ceramicnetwork/streamid";
import axios from "axios";

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

    await this.triggerPin();
  }

  async triggerPin() {
    const index = await this._idx.getIndex();
    const pinsetRecordID = StreamID.fromString(index[IDX_PINSET_KEY]);

    const id = await this._ipfs.id();
    console.log(id);
    console.log(id.addresses);
    // await axios.post(
    //   `${STORAGE_WORKER_ENDPOINT}/pinset/${this._idx.id}/request`,
    //   { pinsetRecordID: pinsetRecordID.toString() },
    //   { headers: { "Content-Type": "application/json" } }
    // );
  }

  async addCid(cid) {
    // Patch object
    const objectStat = await this._ipfs.object.stat(cid);
    this.bucketRoot = await this._ipfs.object.patch.addLink(this.bucketRoot, {
      name: cid,
      cid: new CID(cid),
      size: objectStat.CumulativeSize,
    });

    // Update IDX index
    await this._idx.set(IDX_PINSET_KEY, {
      root: `ipfs://${this.bucketRoot.toString()}`,
    });

    await this.triggerPin();
  }

  async removeCid(cid) {
    // Patch object
    this.bucketRoot = await this._ipfs.object.patch.rmLink(this.bucketRoot, {
      name: cid,
    });

    // Update IDX index
    await this._idx.set(IDX_PINSET_KEY, {
      root: `ipfs://${this.bucketRoot.toString()}`,
    });
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
