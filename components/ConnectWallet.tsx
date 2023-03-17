import { useEffect } from "react";
import { ethers } from "ethers";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import { GeoWebContent } from "@geo-web/content";
import { CeramicClient } from "@ceramicnetwork/http-client";
import { EthereumWebAuth, getAccountId } from "@didtools/pkh-ethereum";
import { DIDSession } from "did-session";
// eslint-disable-next-line import/named
import { SiweMessage, AuthMethod } from "@didtools/cacao";
import { create as createW3UpClient } from "@web3-storage/w3up-client";
import {
  SSXInit,
  SSXClientConfig,
  SSXClientSession,
  SSXConnected,
} from "@spruceid/ssx";
import { CarReader } from "@ipld/car";
import * as API from "@ucanto/interface";
// eslint-disable-next-line import/no-unresolved
import { import as importDelegation } from "@ucanto/core/delegation";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import type { InvocationConfig } from "@web3-storage/upload-client";
import type { IPFS } from "ipfs-core-types";
import {
  SafeAuthKit,
  SafeAuthEvents,
  SafeAuthProviderType,
} from "@safe-global/auth-kit";
import {
  RPC_URLS,
  NETWORK_ID,
  SSX_HOST,
  IPFS_GATEWAY,
  WEB3AUTH_CLIENT_ID,
} from "../lib/constants";
import { getSigner } from "../lib/getSigner";

const ssxConfig: SSXClientConfig = {
  providers: {
    server: { host: SSX_HOST },
  },
};

type ConnectWalletProps = {
  variant?: string;
  ipfs: IPFS | null;
  ceramic: CeramicClient | null;
  safeAuthKit: SafeAuthKit | null;
  setSafeAuthKit: React.Dispatch<React.SetStateAction<SafeAuthKit | null>>;
  setCeramic: React.Dispatch<React.SetStateAction<CeramicClient | null>>;
  setGeoWebContent: React.Dispatch<React.SetStateAction<GeoWebContent | null>>;
  setW3InvocationConfig: React.Dispatch<React.SetStateAction<InvocationConfig>>;
};

export default function ConnectWallet(props: ConnectWalletProps) {
  const {
    variant,
    ipfs,
    ceramic,
    setCeramic,
    safeAuthKit,
    setSafeAuthKit,
    setGeoWebContent,
    setW3InvocationConfig,
  } = props;

  const loadCeramicSession = async (
    ssxConnection: SSXConnected,
    authMethod: AuthMethod,
    address: string
  ): Promise<DIDSession | undefined> => {
    const sessionStr = localStorage.getItem("didsession");
    let session;

    if (sessionStr) {
      session = await DIDSession.fromSession(sessionStr);
    }

    if (
      !session ||
      (session.hasSession && session.isExpired) ||
      !session.cacao.p.iss.includes(address)
    ) {
      try {
        // Get nonce
        const nonce = await ssxConnection.ssxServerNonce({});
        // Create DIDSession
        session = await DIDSession.authorize(authMethod, {
          resources: ["ceramic://*"],
          nonce,
        });

        // Save DIDSession
        localStorage.setItem("didsession", session.serialize());
      } catch (err) {
        console.error(err);
        safeAuthKit?.signOut();
      }
    }

    return session;
  };

  const loadStorageDelegation = async (
    address: string,
    signer: ethers.Signer,
    ssxConnection: SSXConnected,
    session: DIDSession
  ) => {
    const w3Client = await createW3UpClient();
    let sessionKey = ssxConnection.builder.jwk();

    try {
      // Login to SSX
      sessionKey = ssxConnection.builder.jwk();
      if (sessionKey === undefined) {
        return Promise.reject(new Error("unable to retrieve session key"));
      }
      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      const ssxSession: SSXClientSession = {
        address: address!,
        walletAddress: await signer!.getAddress(),
        chainId: NETWORK_ID,
        sessionKey,
        siwe: SiweMessage.fromCacao(session.cacao).toMessage(),
        signature: session.cacao.s!.s,
      };
      await ssxConnection.ssxServerLogin(ssxSession);
    } catch (err) {
      console.error(err);
    }

    if (w3Client.proofs().length === 0) {
      try {
        // Request delegation
        const delegationResp = await ssxConnection.api!.request({
          method: "post",
          url: "/storage/delegation",
          responseType: "blob",
          data: {
            aud: w3Client.agent().did(),
          },
        });
        /* eslint-enable */

        // Save delegation
        if (delegationResp.status !== 200) {
          throw new Error("Unknown status from /storage/delegation");
        }
        const delegationRespBuf = await delegationResp.data.arrayBuffer();
        const delegationRespBytes = new Uint8Array(delegationRespBuf);
        const carReader = await CarReader.fromBytes(delegationRespBytes);
        const blocks: API.Block[] = [];
        for await (const block of carReader.blocks()) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          blocks.push(block as any);
        }

        const delegation = importDelegation(blocks);
        await w3Client.addProof(delegation);
      } catch (err) {
        localStorage.removeItem("didsession");
        initSession();
        return;
      }
    }

    const proofs = w3Client.proofs();
    if (proofs.length === 0) {
      throw new Error("Could not find any proofs");
    }
    if (proofs[0].capabilities.length === 0) {
      throw new Error("Could not find any capabilities");
    }
    const space = proofs[0].capabilities[0].with;
    const w3InvocationConfig = {
      issuer: w3Client.agent(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      with: space as any,
      proofs: proofs,
    };

    return w3InvocationConfig;
  };

  const initSession = async () => {
    if (!ipfs || !ceramic || !safeAuthKit) {
      return;
    }

    const response = await safeAuthKit?.signIn();

    if (safeAuthKit && response?.eoa) {
      const address = response.eoa;
      const signer = getSigner(safeAuthKit);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = (signer as any).provider.provider;
      const accountId = await getAccountId(provider, address);
      const authMethod = await EthereumWebAuth.getAuthMethod(
        provider,
        accountId
      );
      const ssxInit = new SSXInit({
        ...ssxConfig,
        providers: {
          ...ssxConfig.providers,
          web3: {
            driver: provider,
          },
        },
      });
      const ssxConnection = await ssxInit.connect();
      const session = await loadCeramicSession(
        ssxConnection,
        authMethod,
        address
      );

      if (!session) {
        return;
      }

      ceramic.did = session.did;

      const w3InvocationConfig = await loadStorageDelegation(
        address,
        signer,
        ssxConnection,
        session
      );
      const geoWebContent = new GeoWebContent({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ceramic: ceramic as any,
        ipfsGatewayHost: IPFS_GATEWAY,
        ipfs,
        w3InvocationConfig,
      });

      setCeramic(ceramic);
      setW3InvocationConfig(w3InvocationConfig);
      setGeoWebContent(geoWebContent);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      safeAuthKit.subscribe(SafeAuthEvents.SIGNED_OUT as any, () => {
        setSafeAuthKit(null);
      });
    }
  };

  useEffect(() => {
    (async () => {
      const safeAuthKit = await SafeAuthKit.init(
        SafeAuthProviderType.Web3Auth,
        {
          chainId: `0x${NETWORK_ID.toString(16)}`,
          authProviderConfig: {
            rpcTarget: RPC_URLS[NETWORK_ID],
            clientId: WEB3AUTH_CLIENT_ID,
            network: process.env.APP_ENV === "mainnet" ? "mainnet" : "testnet",
            theme: "dark",
          },
        }
      );

      setSafeAuthKit(safeAuthKit ?? null);
    })();
  }, []);

  return (
    <Button
      variant={variant === "header" ? "outline-primary" : "primary"}
      className={`text-light border-dark ${
        variant === "header" ? "fw-bold" : "w-100 fs-6 py-2"
      }`}
      style={{ height: variant === "header" ? "100px" : "auto" }}
      disabled={!ipfs || !ceramic}
      onClick={initSession}
    >
      {variant === "header" && (
        <Image src="vector.png" width="40" style={{ marginRight: 20 }} />
      )}
      {variant === "header"
        ? "Connect Wallet"
        : variant === "claim"
        ? "Connect to Claim"
        : "Connect to Transact"}
    </Button>
  );
}
