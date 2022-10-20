import Home from "../components/Home";
import Map, { STATE, GeoPoint } from "../components/Map";
import FAQ from "../components/FAQ";
import Profile from "../components/profile/Profile";

import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Image from "react-bootstrap/Image";
import Navbar from "react-bootstrap/Navbar";
import Button from "react-bootstrap/Button";
import { NETWORK_ID, CERAMIC_URL } from "../lib/constants";
import { getContractsForChainOrThrow } from "@geo-web/sdk";
import { CeramicClient } from "@ceramicnetwork/http-client";
import { EthereumAuthProvider } from "@ceramicnetwork/blockchain-utils-linking";

import { ethers, BigNumber } from "ethers";
import { useFirebase } from "../lib/Firebase";

import { Framework, NativeAssetSuperToken } from "@superfluid-finance/sdk-core";
import { setSignerForSdkRedux } from "@superfluid-finance/sdk-redux";
import { Contracts } from "@geo-web/sdk/dist/contract/types";

import { getIpfs, providers } from "ipfs-provider";
import type { IPFS } from "ipfs-core-types";
import * as IPFSCore from "ipfs-core";
import { DIDSession } from "did-session";

import { useDisconnect, useAccount, useSigner, useNetwork } from "wagmi";
import {
  ConnectButton,
  useConnectModal,
  useChainModal,
} from "@rainbow-me/rainbowkit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLibrary(provider: any) {
  return new ethers.providers.Web3Provider(provider, "any");
}

const { httpClient, jsIpfs } = providers;

function IndexPage() {
  const [registryContract, setRegistryContract] = React.useState<
    Contracts["registryDiamondContract"] | null
  >(null);
  const [ceramic, setCeramic] = React.useState<CeramicClient | null>(null);
  const [ipfs, setIPFS] = React.useState<IPFS | null>(null);
  const [library, setLibrary] = React.useState<ethers.providers.Web3Provider>();
  const { firebasePerf } = useFirebase();
  const [paymentToken, setPaymentToken] = React.useState<
    NativeAssetSuperToken | undefined
  >(undefined);
  const [sfFramework, setSfFramework] = React.useState<Framework | undefined>(
    undefined
  );
  const [portfolioNeedActionCount, setPortfolioNeedActionCount] =
    React.useState(0);
  const [selectedParcelId, setSelectedParcelId] = React.useState("");
  const [interactionState, setInteractionState] = React.useState<STATE>(
    STATE.VIEWING
  );
  const [portfolioParcelCoords, setPortfolioParcelCoords] =
    React.useState<GeoPoint | null>(null);
  const [isPortfolioToUpdate, setIsPortfolioToUpdate] = React.useState(false);
  const [minForSalePrice, setMinForSalePrice] =
    React.useState<BigNumber | null>(null);

  const { chain } = useNetwork();
  const { address, status } = useAccount();
  const { data: signer } = useSigner();
  const { openConnectModal } = useConnectModal();
  const { openChainModal } = useChainModal();
  const { disconnect } = useDisconnect();

  const connectWallet = () => {
    if (openConnectModal) {
      openConnectModal();
    }
  };

  const disconnectWallet = () => {
    if (disconnect) {
      disconnect();
    }
  };

  const loadCeramicSession = async (
    authMethod: EthereumAuthProvider,
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
      !session.cacao.p.iss.includes(address.toLowerCase())
    ) {
      try {
        session = await DIDSession.authorize(authMethod, {
          resources: ["ceramic://*"],
        });
        localStorage.setItem("didsession", session.serialize());
      } catch (err) {
        console.error(err);
        disconnectWallet();
      }
    }

    return session;
  };

  React.useEffect(() => {
    if (!address || !signer || chain?.id !== NETWORK_ID) {
      return;
    }

    const start = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lib = getLibrary((signer.provider as any).provider);
      setLibrary(lib);

      const framework = await Framework.create({
        chainId: NETWORK_ID,
        provider: lib,
      });
      setSfFramework(framework);

      const superToken = await framework.loadNativeAssetSuperToken("ETHx");
      setPaymentToken(superToken);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSignerForSdkRedux(NETWORK_ID, async () => lib as any);

      const ethereumAuthProvider = new EthereumAuthProvider(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (signer.provider as any).provider,
        address.toLowerCase()
      );
      const session = await loadCeramicSession(ethereumAuthProvider, address);

      if (!session) {
        return;
      }

      // Create Ceramic and DID with resolvers
      const ceramic = new CeramicClient(CERAMIC_URL);
      ceramic.did = session.did;
      setCeramic(ceramic);

      if (!ipfs) {
        const { ipfs, provider, apiAddress } = await getIpfs({
          providers: [
            httpClient({
              loadHttpClientModule: () => require("ipfs-http-client"),
              apiAddress: "/ip4/127.0.0.1/tcp/5001",
            }),
            jsIpfs({
              loadJsIpfsModule: () => IPFSCore,
              options: {
                preload: {
                  enabled: false,
                },
              },
            }),
          ],
        });

        console.log("IPFS API is provided by: " + provider);
        if (provider === "httpClient") {
          console.log("HTTP API address: " + apiAddress);
        }

        setIPFS(ipfs);
      }
    };

    start();
  }, [signer]);

  // Setup Contracts on App Load
  React.useEffect(() => {
    async function contractsSetup() {
      if (sfFramework == null) {
        return;
      }

      const { registryDiamondContract } = getContractsForChainOrThrow(
        NETWORK_ID,
        sfFramework.settings.provider
      );

      registryDiamondContract
        .getMinForSalePrice()
        .then((_minForSalePrice) => {
          setMinForSalePrice(_minForSalePrice);
        });

      setRegistryContract(registryDiamondContract);
    }

    contractsSetup();
  }, [sfFramework]);

  const Connector = () => {
    return (
      <ConnectButton.Custom>
        {({ mounted }) => {
          return (
            <div>
              {(() => {
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

                if (
                  address &&
                  sfFramework &&
                  ceramic &&
                  registryContract &&
                  minForSalePrice &&
                  paymentToken &&
                  library
                ) {
                  return (
                    <Profile
                      account={address.toLowerCase()}
                      sfFramework={sfFramework}
                      ceramic={ceramic}
                      registryContract={registryContract}
                      minForSalePrice={minForSalePrice}
                      disconnectWallet={disconnectWallet}
                      paymentToken={paymentToken}
                      provider={library}
                      portfolioNeedActionCount={portfolioNeedActionCount}
                      setPortfolioNeedActionCount={setPortfolioNeedActionCount}
                      setSelectedParcelId={setSelectedParcelId}
                      interactionState={interactionState}
                      setInteractionState={setInteractionState}
                      setPortfolioParcelCoords={setPortfolioParcelCoords}
                      isPortfolioToUpdate={isPortfolioToUpdate}
                      setIsPortfolioToUpdate={setIsPortfolioToUpdate}
                    />
                  );
                }

                return (
                  <Button
                    variant="outline-primary"
                    className="text-light fw-bold border-dark"
                    disabled={!mounted}
                    style={{ height: "100px" }}
                    onClick={connectWallet}
                  >
                    <Image
                      src="vector.png"
                      width="40"
                      style={{ marginRight: 20 }}
                    />
                    Connect Wallet
                  </Button>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    );
  };

  return (
    <>
      <Container fluid>
        <Navbar
          bg="dark"
          variant="dark"
          fixed="top"
          style={{ height: "100px" }}
          className="border-bottom border-purple border-opacity-25"
        >
          <Col sm="3" className="ps-3 pe-3">
            <FAQ />
          </Col>
          <Col sm="6" className="text-center p-2 mx-auto">
            <div
              className="text-primary"
              style={{ fontSize: "2.5em", fontFamily: "Abel" }}
            >
              <Image style={{ height: "1.1em" }} src="logo.png" /> Geo Web
              Cadastre
            </div>
            <div className="text-light" style={{ fontSize: "1em" }}>
              Claim, transfer, and manage digital land
            </div>
          </Col>
          <Col sm="3" className="ps-3 pe-3 text-end">
            <Connector />
          </Col>
        </Navbar>
      </Container>
      <Container fluid>
        {registryContract &&
        minForSalePrice &&
        address &&
        library &&
        paymentToken &&
        ceramic &&
        ipfs &&
        firebasePerf &&
        sfFramework ? (
          <Row>
            <Map
              registryContract={registryContract}
              minForSalePrice={minForSalePrice}
              account={address.toLowerCase()}
              provider={library}
              ceramic={ceramic}
              ipfs={ipfs}
              firebasePerf={firebasePerf}
              paymentToken={paymentToken}
              sfFramework={sfFramework}
              disconnectWallet={disconnectWallet}
              setPortfolioNeedActionCount={setPortfolioNeedActionCount}
              selectedParcelId={selectedParcelId}
              setSelectedParcelId={setSelectedParcelId}
              interactionState={interactionState}
              setInteractionState={setInteractionState}
              portfolioParcelCoords={portfolioParcelCoords}
              isPortfolioToUpdate={isPortfolioToUpdate}
              setPortfolioParcelCoords={setPortfolioParcelCoords}
              setIsPortfolioToUpdate={setIsPortfolioToUpdate}
            ></Map>
          </Row>
        ) : (
          <Home connectWallet={connectWallet} status={status} />
        )}
      </Container>
    </>
  );
}

export default IndexPage;
