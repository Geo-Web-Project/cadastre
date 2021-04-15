/* 
    Interact with Textile Buckets
    - Store seed in IDX
    - Authentication
    - Provisioning
    - Bucket storage operations
*/

import { PrivateKey } from "@textile/hub";
import { IDX_BUCKETS_SEED_KEY } from "./constants";

/* Check for existing seed in IDX */
async function getIdentity(idx) {
  const jwe = await idx.get(IDX_BUCKETS_SEED_KEY);
  return parseIdentityFromJWE(idx, jwe);
}

/* Save new encrypted seed to IDX */
async function saveIdentity(idx) {
  const jwe = await generateEncryptedIdentity(idx);
  await idx.set(IDX_BUCKETS_SEED_KEY, jwe);
}

async function decryptIdentity(idx, jwe) {
  if (!jwe) {
    return null;
  }
  const seed = await idx.ceramic.did.decryptJWE(jwe);
  return PrivateKey.fromRawEd25519Seed(seed);
}

async function generateEncryptedIdentity(idx) {
  const identity = await PrivateKey.fromRandom();
  const payload = identity.seed;
  const jwe = await idx.ceramic.did.createJWE(payload, [idx.id]);
  return jwe;
}

export {
  getIdentity,
  saveIdentity,
  decryptIdentity,
  generateEncryptedIdentity,
};
