/* 
    Interact with Textile Buckets
    - Store seed in IDX
    - Authentication
    - Provisioning
    - Bucket storage operations
*/

import { Buckets, PrivateKey } from "@textile/hub";
import {
  IDX_BUCKETS_SEED_KEY,
  TEXTILE_HUB_API_KEY_INFO,
  GEO_WEB_BUCKET_NAME,
} from "./constants";

export class GeoWebBucket {
  constructor(idx) {
    this._idx = idx;
    this._identity = null;
    this._buckets = null;
    this._bucketRoot;
  }

  /* Check for existing bucket or provision a new one */
  async fetchOrProvisionBucket() {
    const existingIdentity = await this._getIdentity();
    if (existingIdentity) {
      this._identity = existingIdentity;
    }

    await this._generateAndSaveIdentity();

    // Use the insecure key to set up the buckets client
    this._buckets = await Buckets.withKeyInfo(TEXTILE_HUB_API_KEY_INFO);
    await buckets.getToken(this._identity);

    // Get or create bucket
    const { root, threadID } = await buckets.getOrCreate(GEO_WEB_BUCKET_NAME);
    this._bucketRoot = root;
  }

  /* Check for existing seed in IDX */
  async _getIdentity() {
    const jwe = await this._idx.get(IDX_BUCKETS_SEED_KEY);
    return parseIdentityFromJWE(this._idx, jwe);
  }

  /* Save new encrypted seed to IDX */
  async _generateAndSaveIdentity() {
    const jwe = await generateEncryptedIdentity(this._idx);
    await this._idx.set(IDX_BUCKETS_SEED_KEY, jwe);
  }

  /* Decrypt identity from JWE */
  async _decryptIdentity(jwe) {
    if (!jwe) {
      return null;
    }
    const seed = await this._idx.ceramic.did.decryptJWE(jwe);
    return PrivateKey.fromRawEd25519Seed(seed);
  }

  /* Generate and encrypt identity to JWE */
  async _generateEncryptedIdentity() {
    const identity = await PrivateKey.fromRandom();
    this.identity = identity;
    const payload = identity.seed;
    const jwe = await this._idx.ceramic.did.createJWE(payload, [this._idx.id]);
    return jwe;
  }
}