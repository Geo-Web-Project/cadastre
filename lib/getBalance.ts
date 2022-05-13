import { ethers } from "ethers";
import { formatBalance } from "./formatBalance";

export const getETHBalance = async (
  provider: ethers.providers.Web3Provider,
  account: string
): Promise<string> => {
  const balance = await provider.getBalance(account);

  const ethBalance = formatBalance(balance);

  return ethBalance;
};
