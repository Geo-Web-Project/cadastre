import { Framework } from "@superfluid-finance/sdk-core";

export const sfInstance = async (chainId: number, provider: any) => {
  return await Framework.create({
    chainId,
    provider,
  });
};
