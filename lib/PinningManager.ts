/* eslint-disable import/no-unresolved */
import * as React from "react";
import { GeoWebBucket } from "./GeoWebBucket";
import Queue from "queue-promise";
import type { IPFS } from "ipfs-core-types";
import firebase from "firebase/app";
import { AssetContentManager } from "./AssetContentManager";
import { Cacao, SiweMessage } from "ceramic-cacao";
import axios from "axios";
import { STORAGE_WORKER_ENDPOINT } from "./constants";

export class PinningManager {
  succeededPins: Set<string>;
  failedPins: Set<string>;
  pinningQueue: Queue;

  constructor(
    private geoWebBucket: GeoWebBucket,
    private perf: firebase.performance.Performance
  ) {
    this.succeededPins = new Set();
    this.failedPins = new Set();
    this.pinningQueue = new Queue({
      concurrent: 1,
      interval: 500,
    });
    this.pinningQueue.start();
  }

  async retryPin() {
    if (this.geoWebBucket.latestQueuedLinks) {
      this.geoWebBucket.latestQueuedLinks.forEach((v) => {
        if (!this.isPinned(v.Name)) {
          this.failedPins.delete(v.Name);
        }
      });
    }

    try {
      await this.geoWebBucket.triggerPin();
    } catch (err) {
      this.queueDidFail();
    }
  }

  async pinCid(name: string, cid: string) {
    await new Promise<void>((resolve, reject) => {
      this.pinningQueue.enqueue(async () => {
        console.debug(`Pinning: ${name}, ${cid}`);
        const trace = this.perf.trace("pin_cid");
        trace.start();
        this.failedPins.delete(name);
        try {
          await this.geoWebBucket.addCid(name, cid);
          resolve();
        } catch (err) {
          reject(err);
        }

        this.geoWebBucket
          .triggerPin()
          .then(() => {
            this.succeededPins.add(name);
            trace.putAttribute("success", "true");
            trace.stop();
          })
          .catch((err) => {
            console.warn(err);
            this.failedPins.add(name);
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
          await this.geoWebBucket.removeCid(name);
          resolve();
        } catch (err) {
          reject(err);
        }
        console.debug(`Pin removed: ${name}`);
      });
    });
  }

  isPinned(name: string) {
    return this.geoWebBucket.isPinned(name);
  }

  isQueued(name: string) {
    return this.geoWebBucket.isQueued(name);
  }

  latestQueuedLinks() {
    return this.geoWebBucket.latestQueuedLinks;
  }

  queueDidFail() {
    console.warn(`Current pinset in queue failed`);
    if (this.geoWebBucket.latestQueuedLinks) {
      this.geoWebBucket.latestQueuedLinks.forEach((v) => {
        if (!this.isPinned(v.Name)) {
          this.failedPins.add(v.Name);
        }
      });
    }
  }

  async reset() {
    return this.geoWebBucket.reset();
  }

  async getLink() {
    return await this.geoWebBucket.getBucketLink();
  }

  getStorageLimit() {
    return 500000000;
  }

  async getStorageUsed() {
    return 0;
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

      const _pinningManager = new PinningManager(bucket, firebasePerformance);

      await bucket.fetchOrProvisionBucket((err) => {
        _pinningManager.queueDidFail();
      });

      setPinningManager(_pinningManager);

      console.debug("Pinning manager setup complete");
    }

    setupManager();
  }, [assetContentManager, ipfs, firebasePerformance]);

  return pinningManager;
}
