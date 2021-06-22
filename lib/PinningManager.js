import { IPFS_BOOTSTRAP_PEER } from "./constants";
import * as React from "react";
import { IDX } from "@ceramicstudio/idx";
import { GeoWebBucket } from "./GeoWebBucket";

const JsPinningServiceHttpClient = require("js-pinning-service-http-client");

export class PinningManager {
  constructor(geoWebBucket, ipfs) {
    this._geoWebBucket = geoWebBucket;
    this._ipfs = ipfs;
  }

  async pinCid(cid) {
    this._geoWebBucket.addCid(cid);
  }

  async unpinCid(cid) {
    this._geoWebBucket.removeCid(cid);
  }

  async getLink() {
    return await this._geoWebBucket.getBucketLink();
  }

  getStorageLimit() {
    return 500000000;
  }

  async getBucketRootPath() {
    if (!this._geoWebBucket) {
      return null;
    }

    const bucketRoot = await this._geoWebBucket.fetchBucketRoot();
    return bucketRoot.path;
  }

  async getStorageUsed() {
    const bucketRootPath = (await this.getBucketRootPath()).split("/ipfs/");
    const objectStat = await this._ipfs.object.stat(
      bucketRootPath[bucketRootPath.length - 1]
    );
    return objectStat.CumulativeSize;
  }
}

export function usePinningManager(ceramic, ipfs) {
  const [pinningManager, setPinningManager] = React.useState(null);

  React.useEffect(() => {
    if (!ceramic || !ipfs) {
      return;
    }

    async function setupManager() {
      const idx = new IDX({ ceramic });
      const bucket = new GeoWebBucket(idx);

      await bucket.fetchOrProvisionBucket();

      const _pinningManager = new PinningManager(bucket, ipfs);
      setPinningManager(_pinningManager);
    }

    setupManager();
  }, [ceramic, ipfs]);

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
