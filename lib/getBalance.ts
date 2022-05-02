import { Framework } from "@superfluid-finance/sdk-core";
import { ethers } from "ethers";
import { NETWORK_ID } from "./constants";

export const formatBalance = (balance: string | ethers.BigNumber): string => ethers.utils.formatEther(balance);

export const getETHBalance = async (provider: ethers.providers.Web3Provider, account: string): Promise<string> => {
  const balance = await provider.getBalance(account);

  const ethBalance = formatBalance(balance);

  return ethBalance;
};

export const getETHxBalance = async (provider: ethers.providers.Web3Provider, account: string, paymentTokenAddress: string): Promise<string> => {
  const sf = await Framework.create({
    chainId: NETWORK_ID,
    provider
  });
  
  const ETHx = await sf.loadSuperToken(paymentTokenAddress);

  const { availableBalance } = await ETHx.realtimeBalanceOf({
    account,
    // @ts-ignore
    providerOrSigner: provider,
  });

  const ETHxBalance = formatBalance(availableBalance);

  return ETHxBalance;
}
