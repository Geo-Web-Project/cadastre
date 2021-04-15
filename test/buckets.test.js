import { IDX } from "@ceramicstudio/idx";
import { GeoWebBucket } from "../lib/GeoWebBucket";

describe("buckets", () => {
  let idx;
  beforeAll(async () => {
    idx = new IDX({ ceramic });
  });

  test("should generate and parse identity", async () => {
    const bucket = new GeoWebBucket(idx);

    const encryptedIdentity = await bucket._generateEncryptedIdentity();
    const identity = await bucket._decryptIdentity(encryptedIdentity);
    expect(identity).toBeDefined();
  });
});
