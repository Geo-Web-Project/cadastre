import { IDX } from "@ceramicstudio/idx";
import { decryptIdentity, generateEncryptedIdentity } from "../lib/buckets";

describe("buckets", () => {
  let idx;
  beforeAll(async () => {
    idx = new IDX({ ceramic });
  });

  test("should generate and parse identity", async () => {
    const encryptedIdentity = await generateEncryptedIdentity(idx);
    const identity = await decryptIdentity(idx, encryptedIdentity);
    expect(identity).toBeDefined();
  });
});
