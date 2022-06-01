/* eslint-disable import/no-unresolved */
import Home from "../components/Home";
import Map from "../components/Map";
import FAQ from "../components/FAQ";
import Profile from "../components/profile/Profile";

import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Image from "react-bootstrap/Image";
import Navbar from "react-bootstrap/Navbar";
import Button from "react-bootstrap/Button";
import {
  NETWORK_ID,
  CERAMIC_URL,
  IPFS_BOOTSTRAP_PEER,
  IPFS_PRELOAD_NODE,
} from "../lib/constants";
import { getContractsForChainOrThrow } from "@geo-web/sdk";
import { switchNetwork } from "../lib/wallets/connectors";
import { CeramicClient } from "@ceramicnetwork/http-client";
import { ThreeIdConnect, EthereumAuthProvider } from "@3id/connect";
import { getResolver as getKeyResolver } from "key-did-resolver";
import { getResolver as get3IDResolver } from "@ceramicnetwork/3id-did-resolver";
import { DID } from "dids";

import { ethers } from "ethers";
import { useFirebase } from "../lib/Firebase";
import { useMultiAuth } from "@ceramicstudio/multiauth";

import { Framework } from "@superfluid-finance/sdk-core";
import { setFrameworkForSdkRedux } from "@superfluid-finance/sdk-redux";
import { Contracts } from "@geo-web/sdk/dist/contract/types";

import { getIpfs, providers } from "ipfs-provider";
import { IPFS } from "ipfs-core";

const { httpClient, jsIpfs } = providers;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLibrary(provider: any) {
  return new ethers.providers.Web3Provider(provider);
}

function IndexPage() {
  const [authState, activate, deactivate] = useMultiAuth();

  const [licenseContract, setLicenseContract] = React.useState<
    Contracts["geoWebERC721LicenseContract"] | null
  >(null);
  const [auctionSuperApp, setAuctionSuperApp] = React.useState<
    Contracts["geoWebAuctionSuperAppContract"] | null
  >(null);
  const [fairLaunchClaimer, setFairLaunchClaimer] = React.useState<
    Contracts["geoWebFairLaunchClaimerContract"] | null
  >(null);
  const [ceramic, setCeramic] = React.useState<CeramicClient | null>(null);
  const [ipfs, setIPFS] = React.useState<IPFS | null>(null);
  const [library, setLibrary] =
    React.useState<ethers.providers.Web3Provider | null>(null);
  const { firebasePerf } = useFirebase();
  const [paymentTokenAddress, setPaymentTokenAddress] = React.useState<
    string | undefined
  >(undefined);

  const connectWallet = async () => {
    const _authState = await activate();
    await switchNetwork(_authState?.provider.state.provider);

    const lib = getLibrary(_authState?.provider.state.provider);
    setLibrary(lib);

    const framework = await Framework.create({
      chainId: NETWORK_ID,
      provider: lib,
    });
    const superToken = await framework.loadSuperToken("ETHx");
    setPaymentTokenAddress(superToken.address);
    setFrameworkForSdkRedux(NETWORK_ID, framework);
    // await connect(
    //   new EthereumAuthProvider(
    //     _authState.provider.state.provider,
    //     _authState.accountID.toString()
    //   )
    // );
  };

  const disconnectWallet = async () => {
    // await disconnect();
    await deactivate();
  };

  React.useEffect(() => {
    if (authState.status !== "connected") {
      return;
    }

    const start = async () => {
      const threeIdConnect = new ThreeIdConnect("mainnet");

      await threeIdConnect.connect(
        new EthereumAuthProvider(
          authState.connected.provider.state.provider,
          authState.connected.accountID.address
        )
      );

      // Create Ceramic and DID with resolvers
      const ceramic = new CeramicClient(CERAMIC_URL);
      const didProvider = await threeIdConnect.getDidProvider();

      const did = new DID({
        // Get the DID provider from the 3ID Connect instance
        provider: didProvider,
        resolver: {
          ...get3IDResolver(ceramic as any),
          ...getKeyResolver(),
        },
      });
      await did.authenticate();

      ceramic.did = did;
      setCeramic(ceramic);

      const { ipfs, provider, apiAddress } = await getIpfs({
        providers: [
          httpClient({
            loadHttpClientModule: () => require("ipfs-http-client"),
            apiAddress: "/ip4/127.0.0.1/tcp/5001",
          }),
          jsIpfs({
            loadJsIpfsModule: () => require("ipfs-core"),
            options: {
              config: {
                Bootstrap: [
                  IPFS_BOOTSTRAP_PEER,
                  "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
                  "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
                  "/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp",
                  "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
                  "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
                ],
              },
              preload: {
                enabled: true,
                addresses: [IPFS_PRELOAD_NODE],
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
    };

    start();
  }, [authState]);

  // Setup Contracts on App Load
  React.useEffect(() => {
    async function contractsSetup() {
      if (library == null) {
        return;
      }

      const signer = library.getSigner();

      const {
        geoWebERC721LicenseContract,
        geoWebAuctionSuperAppContract,
        geoWebFairLaunchClaimerContract,
      } = getContractsForChainOrThrow(NETWORK_ID, signer);
      setLicenseContract(geoWebERC721LicenseContract);
      setAuctionSuperApp(geoWebAuctionSuperAppContract);
      setFairLaunchClaimer(geoWebFairLaunchClaimerContract);
    }
    contractsSetup();
  }, [library]);

  const Connector = () => {
    if (authState.status !== "connected") {
      return (
        <Button
          variant="outline-primary"
          className="text-light font-weight-bold border-dark"
          style={{ height: "100px" }}
          disabled={authState.status === "connecting"}
          onClick={() => {
            connectWallet();
          }}
        >
          <Image src="vector.png" width="40" style={{ marginRight: 20 }} />
          Connect Wallet
        </Button>
      );
    } else {
      return (
        <Profile
          account={authState.connected.accountID.address}
          disconnectWallet={disconnectWallet}
          paymentTokenAddress={paymentTokenAddress}
        />
      );
    }
  };

  return (
    <>
      <Container fluid>
        <Navbar
          bg="dark"
          variant="dark"
          fixed="top"
          style={{ height: "100px" }}
          className="border-bottom border-purple"
        >
          <Col sm="3" className="p-0">
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
          <Col sm="3" className="p-0 text-right">
            <Connector />
          </Col>
        </Navbar>
      </Container>
      <Container fluid>
        {authState.status === "connected" &&
        licenseContract &&
        auctionSuperApp &&
        fairLaunchClaimer &&
        library &&
        paymentTokenAddress &&
        ceramic &&
        ipfs &&
        firebasePerf ? (
          <Row>
            <Map
              licenseContract={licenseContract}
              auctionSuperApp={auctionSuperApp}
              claimerContract={fairLaunchClaimer}
              account={authState.connected.accountID.address}
              provider={library}
              ceramic={ceramic}
              ipfs={ipfs}
              firebasePerf={firebasePerf}
              paymentTokenAddress={paymentTokenAddress}
            ></Map>
          </Row>
        ) : (
          <Home />
        )}
      </Container>
    </>
  );
}

export default IndexPage;
