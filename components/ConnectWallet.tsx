import { useEffect } from "react";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import { useDisconnect, useAccount, useSigner, useNetwork } from "wagmi";
import {
  ConnectButton,
  useConnectModal,
  useChainModal,
} from "@rainbow-me/rainbowkit";
import { GeoWebContent } from "@geo-web/content";
import { CeramicClient } from "@ceramicnetwork/http-client";
import { EthereumWebAuth, getAccountId } from "@didtools/pkh-ethereum";
import { DIDSession, createDIDKey } from "did-session";
import { ed25519 as EdSigner } from "@ucanto/principal";

// eslint-disable-next-line import/named
import { SiweMessage, AuthMethod } from "@didtools/cacao";
import { CarReader } from "@ipld/car";
import * as API from "@ucanto/interface";
import { Client } from "@web3-storage/w3up-client";

/* eslint-disable import/no-unresolved */
import { AgentData } from "@web3-storage/access/agent";
import { StoreIndexedDB } from "@web3-storage/access/stores/store-indexeddb";
import { import as importDelegation } from "@ucanto/core/delegation";
/* eslint-enable */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import type { InvocationConfig } from "@web3-storage/upload-client";
import type { IPFS } from "ipfs-core-types";
import { NETWORK_ID, SSX_HOST, IPFS_GATEWAY } from "../lib/constants";
import axios from "axios";
import { randomBytes } from "@stablelib/random";

type ConnectWalletProps = {
  variant?: string;
  ipfs: IPFS | null;
  ceramic: CeramicClient | null;
  setCeramic: React.Dispatch<React.SetStateAction<CeramicClient | null>>;
  setGeoWebContent: React.Dispatch<React.SetStateAction<GeoWebContent | null>>;
  setW3InvocationConfig: React.Dispatch<React.SetStateAction<InvocationConfig>>;
};

async function createW3UpClient(keySeed?: Uint8Array) {
  const store = new StoreIndexedDB("w3up-client");

  if (keySeed) {
    const principal = await EdSigner.derive(keySeed!);
    const data = await AgentData.create({ principal }, { store });
    return new Client(data as any);
  }
  const raw = await store.load();
  if (raw) return new Client(AgentData.fromExport(raw, { store }) as any);
}

export default function ConnectWallet(props: ConnectWalletProps) {
  const {
    variant,
    ipfs,
    ceramic,
    setCeramic,
    setGeoWebContent,
    setW3InvocationConfig,
  } = props;

  const { chain } = useNetwork();
  const { address, status } = useAccount();
  const { data: signer } = useSigner();
  const { openConnectModal } = useConnectModal();
  const { openChainModal } = useChainModal();
  const { disconnect } = useDisconnect();

  const loadSIWESession = async (authMethod: AuthMethod, address: string) => {
    const sessionStr = localStorage.getItem("didsession");
    let session;
    let w3Client: Client | undefined = undefined;

    if (sessionStr) {
      session = await DIDSession.fromSession(sessionStr);
      w3Client = await createW3UpClient();
    }

    if (
      !session ||
      (session.hasSession && session.isExpired) ||
      !session.cacao.p.iss.includes(address)
    ) {
      try {
        // Create DIDSession
        const keySeed = randomBytes(32);
        const didKey = await createDIDKey(keySeed);
        console.log(didKey.id);
        const cacao = await authMethod({
          resources: ["ceramic://*"],
          uri: didKey.id,
        });
        const didCacao = await DIDSession.initDID(didKey, cacao);
        session = new DIDSession({
          cacao,
          keySeed,
          did: didCacao,
        });

        // Create W3Client
        w3Client = await createW3UpClient(keySeed);

        // Save DIDSession
        localStorage.setItem("didsession", session.serialize());
      } catch (err) {
        console.error(err);
        disconnect();
      }
    }

    return { session, w3Client };
  };

  const loadStorageDelegation = async (
    session: DIDSession,
    w3Client: Client
  ) => {
    if (w3Client.proofs().length === 0) {
      try {
        // Request delegation
        const delegationResp = await axios.post(
          `${SSX_HOST}/delegations/storage`,
          {
            siwe: SiweMessage.fromCacao(session.cacao),
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            responseType: "arraybuffer",
          }
        );

        // Save delegation
        if (delegationResp.status !== 200) {
          throw new Error("Unknown status from storage delegations");
        }
        const delegationRespBytes = new Uint8Array(delegationResp.data);
        const carReader = await CarReader.fromBytes(delegationRespBytes);
        const blocks: API.Block[] = [];
        for await (const block of carReader.blocks()) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          blocks.push(block as any);
        }

        const delegation = importDelegation(blocks);
        await w3Client.addProof(delegation);
      } catch (err) {
        console.error(err);
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
    if (!address || !signer || !ipfs || !ceramic || chain?.id !== NETWORK_ID) {
      return;
    }

    const accountId = await getAccountId(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (signer.provider as any).provider,
      address
    );
    const authMethod = await EthereumWebAuth.getAuthMethod(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (signer.provider as any).provider,
      accountId
    );

    const { session, w3Client } = await loadSIWESession(authMethod, address);

    if (!session || !w3Client) {
      return;
    }

    ceramic.did = session.did;
    setCeramic(ceramic);

    const w3InvocationConfig = await loadStorageDelegation(session, w3Client);
    const geoWebContent = new GeoWebContent({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ceramic: ceramic as any,
      ipfsGatewayHost: IPFS_GATEWAY,
      ipfs,
      w3InvocationConfig,
    });

    setW3InvocationConfig(w3InvocationConfig);
    setGeoWebContent(geoWebContent);
  };

  useEffect(() => {
    initSession();
  }, [signer, address, ipfs, ceramic]);

  return (
    <ConnectButton.Custom>
      {({ mounted }) => {
        return (
          <div>
            {(() => {
              if (!mounted) {
                return null;
              }

              if (chain && chain.unsupported) {
                return (
                  <Button
                    onClick={openChainModal}
                    type="button"
                    variant="danger"
                  >
                    Wrong network
                  </Button>
                );
              }

              return (
                <Button
                  variant={variant === "header" ? "outline-primary" : "primary"}
                  className={`text-light border-dark ${
                    variant === "header" ? "fw-bold" : "w-100 fs-6 py-2"
                  }`}
                  disabled={!mounted || status === "connecting"}
                  style={{ height: variant === "header" ? "100px" : "auto" }}
                  onClick={openConnectModal}
                >
                  {variant === "header" && (
                    <Image
                      src="vector.png"
                      width="40"
                      style={{ marginRight: 20 }}
                    />
                  )}
                  {variant === "header"
                    ? "Connect Wallet"
                    : variant === "claim"
                    ? "Connect to Claim"
                    : "Connect to Transact"}
                </Button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
