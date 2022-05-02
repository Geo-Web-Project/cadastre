import { Framework } from "@superfluid-finance/sdk-core";
import { ethers } from "ethers";
import { NETWORK_ID, PAYMENT_TOKEN_ADDRESS } from "./constants";

export const formatBalance = (balance: string): string => ethers.utils.formatEther(balance);

export const getETHBalance = async (provider: any, account: string): Promise<string> => {
  const balance = await provider.getBalance(account);

  const ethBalance = formatBalance(balance);

  return ethBalance;
};

export const getETHxBalance = async (provider: any, account: string): Promise<string> => {
  console.log(provider);
  const sf = await Framework.create({
    chainId: NETWORK_ID,
    provider
  });
  
  const ETHx = await sf.loadSuperToken(PAYMENT_TOKEN_ADDRESS);

  const { availableBalance } = await ETHx.realtimeBalanceOf({
    account,
    // @ts-ignore
    providerOrSigner: provider,
  });

  const ETHxBalance = formatBalance(availableBalance);

  return ETHxBalance;
}
