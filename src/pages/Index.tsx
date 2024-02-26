import { useMemo, useLayoutEffect } from "react";
import Home from "../components/cadastre/Home";
import WelcomeChecklist from "../components/cadastre/WelcomeChecklist";
import Map, { STATE, GeoWebCoordinate } from "../components/cadastre/Map";
import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  ApolloProvider,
} from "@apollo/client";
import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import {
  RPC_URLS_HTTP,
  RPC_URLS_WS,
  NETWORK_ID,
  SSX_HOST,
  WORLD,
  SUBGRAPH_URL,
} from "../lib/constants";
import { getContractsForChainOrThrow } from "@geo-web/sdk";
import { ethers, BigNumber } from "ethers";
import { setSignerForSdkRedux } from "@superfluid-finance/sdk-redux";
import { Contracts } from "@geo-web/sdk/dist/contract/types";
import { useAccount, useNetwork } from "wagmi";
import { useSearchParams } from "react-router-dom";

import { Client as W3Client } from "@web3-storage/w3up-client";
import { DIDSession } from "did-session";
import { ed25519 as EdSigner } from "@ucanto/principal";
import { CarReader } from "@ipld/car";
import * as API from "@ucanto/interface";

/* eslint-disable import/no-unresolved */
import { AgentData } from "@web3-storage/access/agent";
import { StoreIndexedDB } from "@web3-storage/access/stores/store-indexeddb";
import { importDAG } from "@ucanto/core/delegation";
/* eslint-enable */

// eslint-disable-next-line import/named
import { SiweMessage } from "@didtools/cacao";
import axios from "axios";
import type { AuthenticationStatus } from "@rainbow-me/rainbowkit";
import * as u8a from "uint8arrays";
import { syncWorld, SyncWorldResult } from "@geo-web/mud-world-base-setup";
import { optimism, optimismSepolia } from "viem/chains";
import { MUDProvider } from "../context/MUD";
import { useEthersSigner } from "../hooks/ethersAdapters";
import useSuperfluid from "../hooks/superfluid";
import { IWorld, IWorld__factory } from "@geo-web/mud-world-base-contracts";

async function createW3UpClient(didSession: DIDSession) {
  const store = new StoreIndexedDB("w3up-client");

  try {
    const sessionJson = JSON.parse(
      u8a.toString(u8a.fromString(didSession.serialize(), "base64url"))
    );
    const principal = await EdSigner.derive(
      u8a.fromString(sessionJson["sessionKeySeed"], "base64pad")
    );
    const data = await AgentData.create({ principal }, { store });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new W3Client(data as any);
  } catch (e) {
    console.error(e);
    return;
  }
}

type IndexPageProps = {
  authStatus: AuthenticationStatus;
  setAuthStatus: (_: AuthenticationStatus) => void;
  isFullScreen: boolean;
  setIsFullScreen: React.Dispatch<React.SetStateAction<boolean>>;
  portfolioNeedActionCount: number;
  setPortfolioNeedActionCount: React.Dispatch<React.SetStateAction<number>>;
  interactionState: STATE;
  setInteractionState: React.Dispatch<React.SetStateAction<STATE>>;
  selectedParcelId: string;
  setSelectedParcelId: React.Dispatch<React.SetStateAction<string>>;
  shouldRefetchParcelsData: boolean;
  setShouldRefetchParcelsData: React.Dispatch<React.SetStateAction<boolean>>;
};

function IndexPage(props: IndexPageProps) {
  const {
    authStatus,
    setAuthStatus,
    isFullScreen,
    setIsFullScreen,
    setPortfolioNeedActionCount,
    interactionState,
    setInteractionState,
    selectedParcelId,
    setSelectedParcelId,
    shouldRefetchParcelsData,
    setShouldRefetchParcelsData,
  } = props;

  const [params] = useSearchParams();
  const { sfFramework, nativeSuperToken } = useSuperfluid();

  const [registryContract, setRegistryContract] = React.useState<
    Contracts["registryDiamondContract"] | null
  >(null);
  const [library, setLibrary] =
    React.useState<ethers.providers.JsonRpcProvider>();
  const [auctionStart, setAuctionStart] = React.useState<BigNumber>(
    BigNumber.from(0)
  );
  const [auctionEnd, setAuctionEnd] = React.useState<BigNumber>(
    BigNumber.from(0)
  );
  const [startingBid, setStartingBid] = React.useState<BigNumber>(
    BigNumber.from(0)
  );
  const [endingBid, setEndingBid] = React.useState<BigNumber>(
    BigNumber.from(0)
  );
  const [geoWebCoordinate, setGeoWebCoordinate] =
    React.useState<GeoWebCoordinate>();
  const [w3Client, setW3Client] = React.useState<W3Client | null>(null);

  const [worldConfig, setWorldConfig] =
    React.useState<typeof SyncWorldResult>();
  const [worldContract, setWorldContract] = React.useState<IWorld | undefined>(
    undefined
  );

  const { chain } = useNetwork();
  const { address } = useAccount();
  const ethersSigner = useEthersSigner();

  const client = useMemo(
    () =>
      new ApolloClient({
        link: new HttpLink({
          uri: SUBGRAPH_URL,
        }),
        cache: new InMemoryCache({
          typePolicies: {
            Query: {
              fields: {
                geoWebParcels: {
                  keyArgs: ["skip", "orderBy"],
                  merge(existing = [], incoming) {
                    return [...existing, ...incoming];
                  },
                },
              },
            },
          },
        }),
      }),
    []
  );

  useLayoutEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "auto";
    };
  });

  async function resetSession() {
    const store = new StoreIndexedDB("w3up-client");
    await store.reset();

    localStorage.removeItem("didsession");

    console.debug("Reset SIWE session");

    setAuthStatus("unauthenticated");
  }

  const loadSIWESession = async (address: string) => {
    const sessionStr = localStorage.getItem("didsession");
    let session;
    let w3Client: W3Client | undefined = undefined;

    if (sessionStr) {
      session = await DIDSession.fromSession(sessionStr);
      w3Client = await createW3UpClient(session);
    }

    if (
      !session ||
      (session.hasSession && session.isExpired) ||
      !session.cacao.p.iss.includes(address)
    ) {
      await resetSession();
    }

    return { session, w3Client };
  };

  const loadStorageDelegation = async (
    session: DIDSession,
    w3Client: W3Client
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

        const delegation = importDAG(blocks);
        await w3Client.addProof(delegation);
      } catch (err) {
        console.error(err);
        await resetSession();
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
    const did = (await w3Client.addSpace(proofs[0])).did();
    await w3Client.setCurrentSpace(did);
    const w3InvocationConfig = {
      issuer: w3Client.agent,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      with: space as any,
      proofs: proofs,
    };

    return w3InvocationConfig;
  };

  const initSession = async () => {
    if (!address || !ethersSigner || chain?.id !== NETWORK_ID) {
      return;
    }

    const { session, w3Client } = await loadSIWESession(address);

    if (!session || !w3Client) {
      return;
    }

    const storageDelegation = await loadStorageDelegation(session, w3Client);

    // Check for old providers
    if (
      storageDelegation &&
      storageDelegation?.with !==
        "did:key:z6MkjcKXuTm4BsFWJz4nffFrihRjvETNcxH3bPKjbqXLXC7G"
    ) {
      await resetSession();
    }

    setW3Client(w3Client);
  };

  React.useEffect(() => {
    initSession();
  }, [authStatus, ethersSigner, address]);

  React.useEffect(() => {
    const start = async () => {
      // eslint-disable-next-line import/no-unresolved
      import("as-geo-web-coordinate").then((geoWebCoordinate) => {
        setGeoWebCoordinate(geoWebCoordinate);
      });

      const lib = new ethers.providers.JsonRpcBatchProvider(
        RPC_URLS_HTTP[NETWORK_ID],
        NETWORK_ID
      );
      setLibrary(lib);

      const { registryDiamondContract } = getContractsForChainOrThrow(
        NETWORK_ID,
        lib
      );
      setRegistryContract(registryDiamondContract);

      const [_auctionStart, _auctionEnd, _startingBid, _endingBid] =
        await Promise.all([
          registryDiamondContract.getAuctionStart(),
          registryDiamondContract.getAuctionEnd(),
          registryDiamondContract.getStartingBid(),
          registryDiamondContract.getEndingBid(),
        ]);

      if (!_auctionStart.isZero() || !_auctionEnd.isZero()) {
        setAuctionStart(_auctionStart);
        setAuctionEnd(_auctionEnd);
        setStartingBid(_startingBid);
        setEndingBid(_endingBid);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSignerForSdkRedux(NETWORK_ID, async () => lib as any);
    };

    start();
  }, []);

  // Store referralId with an expiration of one week
  React.useEffect(() => {
    const ref = params.get("ref");

    if (ref) {
      localStorage.setItem(
        "referral",
        JSON.stringify({
          referralID: ref,
          expiration: Date.now() + 60 * 60 * 24 * 7 * 1000,
        })
      );
    }
  }, [params]);

  React.useEffect(() => {
    (async () => {
      const chain =
        import.meta.env.MODE === "mainnet" ? optimism : optimismSepolia;
      const mudChain = {
        ...chain,
        rpcUrls: {
          ...chain.rpcUrls,
          default: {
            http: [RPC_URLS_HTTP[NETWORK_ID]],
            webSocket: [RPC_URLS_WS[NETWORK_ID]],
          },
        },
      };
      const worldConfig = await syncWorld({
        mudChain,
        chainId: NETWORK_ID,
        world: WORLD,
        namespaces: [Number(selectedParcelId).toString()],
        indexerUrl: "https://mud-testnet.geoweb.network/trpc",
        startSync:
          selectedParcelId !== "" && import.meta.env.MODE !== "mainnet",
      });

      setWorldConfig(worldConfig);

      if (library) {
        setWorldContract(IWorld__factory.connect(WORLD.worldAddress, library));
      }
    })();
  }, [selectedParcelId, library]);

  return (
    <ApolloProvider client={client}>
      <Container fluid>
        {registryContract &&
        nativeSuperToken &&
        library &&
        geoWebCoordinate &&
        sfFramework &&
        worldConfig &&
        worldContract ? (
          <Row>
            <MUDProvider value={worldConfig}>
              <Map
                registryContract={registryContract}
                authStatus={authStatus}
                signer={ethersSigner ?? null}
                account={address?.toLowerCase() ?? ""}
                w3Client={w3Client}
                geoWebCoordinate={geoWebCoordinate}
                paymentToken={nativeSuperToken}
                sfFramework={sfFramework}
                setPortfolioNeedActionCount={setPortfolioNeedActionCount}
                selectedParcelId={selectedParcelId}
                setSelectedParcelId={setSelectedParcelId}
                interactionState={interactionState}
                setInteractionState={setInteractionState}
                shouldRefetchParcelsData={shouldRefetchParcelsData}
                setShouldRefetchParcelsData={setShouldRefetchParcelsData}
                auctionStart={auctionStart}
                auctionEnd={auctionEnd}
                startingBid={startingBid}
                endingBid={endingBid}
                isFullScreen={isFullScreen}
                setIsFullScreen={setIsFullScreen}
                worldContract={worldContract}
              ></Map>
            </MUDProvider>
          </Row>
        ) : (
          <Home />
        )}
        <WelcomeChecklist />
      </Container>
    </ApolloProvider>
  );
}

export default IndexPage;
