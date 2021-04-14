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
  if (!jwe) {
    return null;
  }
  const seed = await idx.did.decryptJWE(jwe);
  return PrivateKey.fromRawEd25519Seed(seed);
}

/* Save new encrypted seed to IDX */
async function saveIdentity(idx) {
  const identity = await PrivateKey.fromRandom();
  const payload = identity.bytes();
  const jwe = await idx.did.createJWE(payload, [idx.did.id]);
  await idx.set(IDX_BUCKETS_SEED_KEY, jwe);
}

export { getIdentity, saveIdentity };
