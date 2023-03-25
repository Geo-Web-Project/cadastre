import { ethers } from "ethers";
import Safe, { SafeFactory } from "@safe-global/safe-core-sdk";
import EthersAdapter from "@tnrdd/safe-ethers-lib";
import { SafeAuthEvents } from "@safe-global/auth-kit";
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
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import { GeoWebContent } from "@geo-web/content";
import { CeramicClient } from "@ceramicnetwork/http-client";
import { SmartAccount } from "../pages/index";
import { getSigner } from "../lib/getSigner";
import {
  NETWORK_ID,
  SSX_HOST,
  IPFS_GATEWAY,
  GW_SAFE_SALT_NONCE,
} from "../lib/constants";

const ssxConfig: SSXClientConfig = {
  providers: {
    server: { host: SSX_HOST },
  },
};

type ConnectWalletProps = {
  variant?: string;
  ipfs: IPFS | null;
  ceramic: CeramicClient | null;
  smartAccount: SmartAccount | null;
  setSmartAccount: React.Dispatch<React.SetStateAction<SmartAccount | null>>;
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
    smartAccount,
    setSmartAccount,
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
        smartAccount?.safeAuthKit?.signOut();
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

    let ssxSession: SSXClientSession;
    try {
      // Login to SSX
      sessionKey = ssxConnection.builder.jwk();
      if (sessionKey === undefined) {
        return Promise.reject(new Error("unable to retrieve session key"));
      }
      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      ssxSession = {
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
            siwe: ssxSession!.siwe,
            signature: ssxSession!.signature,
            daoLogin: false,
            resolveEns: false,
            resolveLens: false,
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
        // initSession();
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
    if (!ipfs || !ceramic || !smartAccount?.safeAuthKit) {
      return;
    }

    let safe: Safe | undefined = undefined;

    const { safeAuthKit, relayAdapter } = smartAccount;
    const response = await safeAuthKit.signIn();

    if (safeAuthKit && response?.eoa) {
      const eoaAddress = response.eoa;
      const signer = getSigner(safeAuthKit);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = (signer as any).provider.provider;
      const accountId = await getAccountId(provider, eoaAddress);
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
        eoaAddress
      );

      if (!session) {
        return;
      }

      ceramic.did = session.did;

      const w3InvocationConfig = await loadStorageDelegation(
        eoaAddress,
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

      const ethAdapter = new EthersAdapter({
        ethers,
        signerOrProvider: signer,
      });
      const safeFactory = await SafeFactory.create({ ethAdapter });
      const safeOpts = {
        safeAccountConfig: {
          threshold: 1,
          owners: [eoaAddress],
        },
        safeDeploymentConfig: {
          saltNonce: GW_SAFE_SALT_NONCE,
        },
      };
      const safeAddress = await safeFactory.predictSafeAddress(safeOpts);

      try {
        safe = await Safe.create({ ethAdapter, safeAddress });
      } catch (err) {
        console.info((err as Error).message);
      }

      setSmartAccount({ ...smartAccount, eoaAddress, safeAddress, safe });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      safeAuthKit.subscribe(SafeAuthEvents.SIGNED_OUT as any, () => {
        setSmartAccount({ safeAuthKit, relayAdapter });
      });
    }
  };

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
