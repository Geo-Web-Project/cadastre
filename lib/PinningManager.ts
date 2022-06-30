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
  private _geoWebBucket: GeoWebBucket;
  private _ipfs: IPFS;
  private _perf: firebase.performance.Performance;
  private cacao: Cacao;

  succeededPins: Set<string>;
  failedPins: Set<string>;
  pinningQueue: Queue;

  constructor(
    geoWebBucket: GeoWebBucket,
    ipfs: IPFS,
    firebasePerformance: firebase.performance.Performance,
    cacao: Cacao
  ) {
    this._geoWebBucket = geoWebBucket;
    this._ipfs = ipfs;
    this.succeededPins = new Set();
    this.failedPins = new Set();
    this._perf = firebasePerformance;
    this.cacao = cacao;
    this.pinningQueue = new Queue({
      concurrent: 1,
      interval: 500,
    });
    this.pinningQueue.start();
  }

  async authenticate() {
    try {
      const nonceResult = await axios.get(
        `${STORAGE_WORKER_ENDPOINT}/estuary/nonce`
      );
      const nonce = nonceResult.data["nonce"];

      const message = SiweMessage.fromCacao(this.cacao);

      const tokenResult = await axios.post(
        `${STORAGE_WORKER_ENDPOINT}/estuary/token`,
        { message: message.toMessage(), signature: message.signature! },
        { headers: { "Content-Type": "application/json" } }
      );
      console.log(tokenResult);
    } catch (err) {
      return;
    }
  }

  async retryPin() {
    if (this._geoWebBucket.latestQueuedLinks) {
      this._geoWebBucket.latestQueuedLinks.forEach((v) => {
        if (!this.isPinned(v.Name)) {
          this.failedPins.delete(v.Name);
        }
      });
    }

    try {
      await this._geoWebBucket.triggerPin();
    } catch (err) {
      this.queueDidFail();
    }
  }

  async pinCid(name: string, cid: string) {
    await new Promise<void>((resolve, reject) => {
      this.pinningQueue.enqueue(async () => {
        console.debug(`Pinning: ${name}, ${cid}`);
        const trace = this._perf.trace("pin_cid");
        trace.start();
        this.failedPins.delete(name);
        try {
          await this._geoWebBucket.addCid(name, cid);
          resolve();
        } catch (err) {
          reject(err);
        }

        this._geoWebBucket
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
          await this._geoWebBucket.removeCid(name);
          resolve();
        } catch (err) {
          reject(err);
        }
        console.debug(`Pin removed: ${name}`);
      });
    });
  }

  isPinned(name: string) {
    return this._geoWebBucket.isPinned(name);
  }

  isQueued(name: string) {
    return this._geoWebBucket.isQueued(name);
  }

  latestQueuedLinks() {
    return this._geoWebBucket.latestQueuedLinks;
  }

  queueDidFail() {
    console.warn(`Current pinset in queue failed`);
    if (this._geoWebBucket.latestQueuedLinks) {
      this._geoWebBucket.latestQueuedLinks.forEach((v) => {
        if (!this.isPinned(v.Name)) {
          this.failedPins.add(v.Name);
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
    const objectStat = await this._ipfs.object.stat(
      this._geoWebBucket.bucketRoot!
    );
    const links = await this._ipfs.object.links(this._geoWebBucket.bucketRoot!);
    const linkSizes = links.reduce((sizes, link) => {
      const newSizes = sizes;
      newSizes[link.Hash.toString()] = link.Tsize;
      return newSizes;
    }, {} as Record<string, any>);
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
        firebasePerformance,
        assetContentManager.ceramic.did!.capability
      );

      await _pinningManager.authenticate();

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
