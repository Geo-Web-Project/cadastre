import * as React from "react";
import { GeoWebBucket } from "./GeoWebBucket";
import Queue from "queue-promise";
import type { IPFS } from "ipfs-core-types";
import firebase from "firebase/app";
import { AssetContentManager } from "./AssetContentManager";
import { CID } from "multiformats/cid";

export class PinningManager {
  private _geoWebBucket: GeoWebBucket;
  private _ipfs: IPFS;
  private _perf: firebase.performance.Performance;

  succeededPins: Set<CID>;
  failedPins: Set<CID>;
  pinningQueue: Queue;

  constructor(
    geoWebBucket: GeoWebBucket,
    ipfs: IPFS,
    firebasePerformance: firebase.performance.Performance
  ) {
    this._geoWebBucket = geoWebBucket;
    this._ipfs = ipfs;
    this.succeededPins = new Set();
    this.failedPins = new Set();
    this._perf = firebasePerformance;
    this.pinningQueue = new Queue({
      concurrent: 1,
      interval: 500,
    });
    this.pinningQueue.start();
  }

  async retryPin() {
    if (this._geoWebBucket.latestQueuedLinks) {
      this._geoWebBucket.latestQueuedLinks.forEach((v) => {
        if (!this.isPinned(v)) {
          this.failedPins.delete(v);
        }
      });
    }

    try {
      await this._geoWebBucket.triggerPin();
    } catch (err) {
      this.queueDidFail();
    }
  }

  async pinCid(name: string, cid: CID) {
    await new Promise<void>((resolve, reject) => {
      this.pinningQueue.enqueue(async () => {
        console.debug(`Pinning: ${name}, ${cid}`);
        const trace = this._perf.trace("pin_cid");
        trace.start();
        this.failedPins.delete(cid);
        try {
          await this._geoWebBucket.addCid(name, cid);
          resolve();
        } catch (err) {
          reject(err);
        }

        this._geoWebBucket
          .triggerPin()
          .then(() => {
            this.succeededPins.add(cid);
            trace.putAttribute("success", "true");
            trace.stop();
          })
          .catch((err) => {
            console.warn(err);
            this.failedPins.add(cid);
            trace.putAttribute("success", "false");
            trace.stop();
          });

        console.debug(`Pin complete: ${name}, ${cid}`);
      });
    });
  }

  async unpinCid(name: string) {
    await new Promise<void>((resolve, reject) => {
      this.pinningQueue.enqueue(async () => {
        console.debug(`Removing pin: ${name}`);
        try {
          await this._geoWebBucket.removeCid(name);
          resolve();
        } catch (err) {
          reject(err);
        }
        console.debug(`Pin removed: ${name}`);
      });
    });
  }

  isPinned(cid: CID) {
    return this._geoWebBucket.isPinned(cid);
  }

  isQueued(cid: CID) {
    return this._geoWebBucket.isQueued(cid);
  }

  latestQueuedLinks() {
    return this._geoWebBucket.latestQueuedLinks;
  }

  queueDidFail() {
    console.warn(`Current pinset in queue failed`);
    if (this._geoWebBucket.latestQueuedLinks) {
      this._geoWebBucket.latestQueuedLinks.forEach((v) => {
        if (!this.isPinned(v)) {
          this.failedPins.add(v);
        }
      });
    }
  }

  async reset() {
    return this._geoWebBucket.reset();
  }

  async getLink() {
    return await this._geoWebBucket.getBucketLink();
  }

  getStorageLimit() {
    return 500000000;
  }

  async getStorageUsed() {
    if (!this._geoWebBucket.bucketRoot) {
      return;
    }
    const objectStat = await this._ipfs.object.stat(
      this._geoWebBucket.bucketRoot
    );
    const links = await this._ipfs.object.links(this._geoWebBucket.bucketRoot);
    const linkSizes = links.reduce((sizes, link) => {
      const newSizes = sizes;
      if (link.Tsize) {
        newSizes[link.Hash.toString()] = link.Tsize;
      } else {
        delete newSizes[link.Hash.toString()];
      }
      return newSizes;
    }, {} as Record<string, number>);
    const uniqueLinkSize = Object.values(linkSizes).reduce((total, size) => {
      return total + size;
    }, 0);
    return uniqueLinkSize + objectStat.BlockSize;
  }
}

export function usePinningManager(
  assetContentManager: AssetContentManager | null,
  ipfs: IPFS | null,
  firebasePerformance: firebase.performance.Performance | null
) {
  const [pinningManager, setPinningManager] =
    React.useState<PinningManager | null>(null);

  React.useEffect(() => {
    async function setupManager() {
      if (!assetContentManager || !ipfs || !firebasePerformance) {
        setPinningManager(null);
        return;
      }

      console.debug("Setting up pinning manager...");

      const bucket = new GeoWebBucket(assetContentManager, ipfs);

      const pinsetStreamId = await assetContentManager.getRecordID(
        "geoWebPinset"
      );

      console.debug(`Setting up geoWebPinset: ${pinsetStreamId}`);
      await bucket.setExistingStreamId(pinsetStreamId);
      console.debug(`Setup geoWebPinset complete.`);

      const _pinningManager = new PinningManager(
        bucket,
        ipfs,
        firebasePerformance
      );

      await bucket.fetchOrProvisionBucket(() => {
        _pinningManager.queueDidFail();
      });

      setPinningManager(_pinningManager);

      console.debug("Pinning manager setup complete");
    }

    setupManager();
  }, [assetContentManager, ipfs, firebasePerformance]);

  return pinningManager;
}
