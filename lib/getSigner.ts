import { ethers } from "ethers";
import { SafeAuthKit } from "@safe-global/auth-kit";

export function getSigner(safeAuthKit: SafeAuthKit) {
  const provider = new ethers.providers.Web3Provider(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    safeAuthKit.getProvider()!
  );

  return provider.getSigner();
}
