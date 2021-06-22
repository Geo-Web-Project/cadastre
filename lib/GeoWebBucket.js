/* 
    Interact with Geo Web Pinset
    - Store CIDs in a UnixFs tree
    - Store root CID in Geo Web Pinset IDX index
    - Trigger Geo Web service to fetch latest pinset from DID
*/

import {
  IDX_PINSET_KEY,
} from "./constants";
import CID from "cids";

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
        template: 'unixfs-dir'
      })
    }
  }

  async addCid(cid) {
    // Patch object
    this.bucketRoot = await this._ipfs.object.patch.addLink(this.bucketRoot, {
      name: cid,
      cid: new CID(cid)
    })

    // Update IDX index
    await this._idx.set(IDX_PINSET_KEY, {root: `ipfs://${this.bucketRoot.toString()}`});

    // TODO: Trigger pin
  }

  async removeCid(cid) {
    // Patch object
    this.bucketRoot = await this._ipfs.object.patch.rmLink(this.bucketRoot, {
      name: cid
    })

    // Update IDX index
    await this._idx.set(IDX_PINSET_KEY, {root: `ipfs://${this.bucketRoot.toString()}`});
  }

  async getBucketLink() {
    return this.bucketRoot ? `https://dweb.link/ipfs/${this.bucketRoot.toString()}` : null;
  }

  // async listArchives() {
  //   return await this._buckets.archives(this._bucketRoot.key);
  // }
}
