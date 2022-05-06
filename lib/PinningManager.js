import { IPFS_BOOTSTRAP_PEER } from "./constants";
import * as React from "react";
import { GeoWebBucket } from "./GeoWebBucket";
import Queue from "queue-promise";

import JsPinningServiceHttpClient from "js-pinning-service-http-client";

export class PinningManager {
  constructor(geoWebBucket, ipfs, firebasePerformance) {
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

  async retryPin(name) {
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

  async pinCid(name, cid) {
    await new Promise((resolve, reject) => {
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

  async unpinCid(name) {
    await new Promise((resolve, reject) => {
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

  isPinned(name) {
    return this._geoWebBucket.isPinned(name);
  }

  isQueued(name) {
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
      this._geoWebBucket.bucketRoot
    );
    const links = await this._ipfs.object.links(this._geoWebBucket.bucketRoot);
    const linkSizes = links.reduce((sizes, link) => {
      var newSizes = sizes;
      newSizes[link.Hash.toString()] = link.Tsize;
      return newSizes;
    }, {});
    const uniqueLinkSize = Object.values(linkSizes).reduce((total, size) => {
      return total + size;
    }, 0);
    return uniqueLinkSize + objectStat.BlockSize;
  }
}

export function usePinningManager(
  dataStore,
  didNFT,
  ipfs,
  firebasePerformance
) {
  const [pinningManager, setPinningManager] = React.useState(null);

  React.useEffect(() => {
    if (!dataStore || !ipfs || !firebasePerformance) {
      setPinningManager(null);
      return;
    }

    async function setupManager() {
      console.debug("Setting up pinning manager...");

      const bucket = new GeoWebBucket(dataStore, didNFT, ipfs);

      const pinsetStreamId = await dataStore.getRecordID(
        dataStore.getDefinitionID("geoWebPinset"),
        didNFT
      );

      console.debug(`Setting up geoWebPinset: ${pinsetStreamId}`);
      await bucket.setExistingStreamId(pinsetStreamId);
      console.debug(`Setup geoWebPinset complete.`);

      const _pinningManager = new PinningManager(
        bucket,
        ipfs,
        firebasePerformance
      );

      await bucket.fetchOrProvisionBucket((err) => {
        _pinningManager.queueDidFail();
      });

      setPinningManager(_pinningManager);

      console.debug("Pinning manager setup complete");
    }

    setupManager();
  }, [dataStore, ipfs, firebasePerformance]);

  return pinningManager;
}

export async function pinCid(
  ipfs,
  pinningServiceEndpoint,
  pinningServiceAccessToken,
  name,
  cid,
  updatePinningData
) {
  const pinningServiceClient = JsPinningServiceHttpClient.PinsApiFactory({
    basePath: pinningServiceEndpoint,
    accessToken: pinningServiceAccessToken,
  });

  updatePinningData({
    [cid]: {
      status: "queued",
    },
  });

  // Check for existing pin
  const pins = await pinningServiceClient.pinsGet();
  const existingPins = pins.data.results.filter((item) => item.pin.cid == cid);
  const existingPin = existingPins.length > 0 ? existingPins[0] : null;

  if (existingPin) {
    // Add pin data
    updatePinningData({
      [cid]: {
        requestid: existingPin.requestid,
        status: existingPin.status,
      },
    });

    return;
  }

  // Get node addresses
  const id = await ipfs.id();
  const addresses = id.addresses
    .map((a) => a.toString())
    .filter(
      // Filter out local addresses
      (a) =>
        !a.startsWith("/ip4/127.0.0.1") &&
        !a.startsWith("/ip6/::1") &&
        !a.startsWith("/ip4/192.168")
    )
    .concat(IPFS_BOOTSTRAP_PEER);

  // Pin cid
  try {
    const result = await pinningServiceClient.pinsPost({
      cid: cid,
      name: name,
      origins: addresses,
    });

    updatePinningData({
      [cid]: {
        requestid: result.data.requestid,
        status: result.data.status,
      },
    });

    // Poll status
    const interval = setInterval(async () => {
      const pollResult = await pinningServiceClient.pinsRequestidGet(
        result.data.requestid
      );

      updatePinningData({
        [cid]: {
          requestid: pollResult.data.requestid,
          status: pollResult.data.status,
        },
      });

      if (
        pollResult.data.status == "pinned" ||
        pollResult.data.status == "failed"
      ) {
        clearInterval(interval);
      }
    }, 1000);
  } catch (error) {
    if (
      error.response &&
      error.response.data &&
      error.response.data.error.reason == "DUPLICATE_OBJECT"
    ) {
      updatePinningData({
        [cid]: {
          status: "pinned",
        },
      });
    } else {
      updatePinningData({
        [cid]: {
          status: "failed",
        },
      });
    }
  }
}

export async function unpinCid(
  pinningData,
  pinningServiceEndpoint,
  pinningServiceAccessToken,
  cid,
  updatePinningData
) {
  if (!pinningData[cid]) {
    return;
  }

  const pinningServiceClient = JsPinningServiceHttpClient.PinsApiFactory({
    basePath: pinningServiceEndpoint,
    accessToken: pinningServiceAccessToken,
  });

  // Unpin cid
  await pinningServiceClient.pinsRequestidDelete(pinningData[cid].requestid);

  updatePinningData({
    [cid]: null,
  });
}
