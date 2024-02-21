import { ethers } from "ethers";

export const formatBalance = (balance: string | ethers.BigNumber): string =>
  ethers.utils.formatEther(balance);
