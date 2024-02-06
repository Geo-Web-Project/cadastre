import { useMemo } from "react";
import {
  PublicClient,
  usePublicClient,
  WalletClient,
  useWalletClient,
} from "wagmi";
import { providers } from "ethers";
import { HttpTransport } from "viem";

function publicClientToProvider(publicClient: PublicClient) {
  const { chain, transport } = publicClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };

  if (transport.type === "fallback")
    return new providers.FallbackProvider(
      (transport.transports as ReturnType<HttpTransport>[]).map(
        ({ value }) => new providers.JsonRpcBatchProvider(value?.url, network)
      )
    );

  return new providers.JsonRpcProvider(transport.url, network);
}

function useEthersProvider() {
  const publicClient = usePublicClient();

  return useMemo(() => publicClientToProvider(publicClient), [publicClient]);
}

function walletClientToSigner(walletClient: WalletClient) {
  const { account, chain, transport } = walletClient;

  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new providers.Web3Provider(transport, network);
  const signer = provider.getSigner(account.address);

  return signer;
}

function useEthersSigner() {
  const { data: walletClient } = useWalletClient();

  return useMemo(
    () => (walletClient ? walletClientToSigner(walletClient) : undefined),
    [walletClient]
  );
}

export { useEthersProvider, useEthersSigner };
