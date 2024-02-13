import { useEffect, useState, createContext, useContext } from "react";
import {
  Framework,
  NativeAssetSuperToken,
  WrapperSuperToken,
} from "@superfluid-finance/sdk-core";
import { useEthersProvider } from "../hooks/ethersAdapters";
import {
  NETWORK_ID,
  SUPERFLUID_RESOLVER_ADDRESS,
  DAIX_ADDRESS,
} from "../lib/constants";

export const SuperfluidContext = createContext<{
  sfFramework: Framework | null;
  nativeSuperToken: NativeAssetSuperToken | null;
  wrapperSuperToken: WrapperSuperToken | null;
}>({ sfFramework: null, nativeSuperToken: null, wrapperSuperToken: null });

export function useSuperfluidContext() {
  const context = useContext(SuperfluidContext);

  if (!context) {
    throw Error("Superfluid context was not found");
  }

  return context;
}

export default function SuperfluidContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sfFramework, setSfFramework] = useState<Framework | null>(null);
  const [nativeSuperToken, setNativeSuperToken] =
    useState<NativeAssetSuperToken | null>(null);
  const [wrapperSuperToken, setWrapperSuperToken] =
    useState<WrapperSuperToken | null>(null);

  const ethersProvider = useEthersProvider();

  useEffect(() => {
    (async () => {
      if (ethersProvider) {
        const sfFramework = await Framework.create({
          chainId: NETWORK_ID,
          resolverAddress: SUPERFLUID_RESOLVER_ADDRESS,
          provider: ethersProvider,
        });
        const nativeSuperToken = await sfFramework.loadNativeAssetSuperToken(
          "ETHx"
        );
        const wrapperSuperToken = await sfFramework.loadWrapperSuperToken(
          DAIX_ADDRESS
        );

        setSfFramework(sfFramework);
        setNativeSuperToken(nativeSuperToken);
        setWrapperSuperToken(wrapperSuperToken);
      }
    })();
  }, [ethersProvider]);

  return (
    <SuperfluidContext.Provider
      value={{
        sfFramework,
        nativeSuperToken,
        wrapperSuperToken,
      }}
    >
      {children}
    </SuperfluidContext.Provider>
  );
}
