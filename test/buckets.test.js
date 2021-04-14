const { IDX } = require("@ceramicstudio/idx");
const { getIdentity, saveIdentity } = require("../lib/buckets");

describe("buckets", () => {
  let idx;
  beforeAll(() => {
    idx = new IDX({ ceramic });
  });

  test("should set and get seed", () => {
    const identity = saveIdentity(idx);
    console.log(identity);
  });
});
