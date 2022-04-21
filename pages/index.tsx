import Home from "../components/Home";
import Map from "../components/Map";
import FAQ from "../components/FAQ";
import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Image from "react-bootstrap/Image";
import Badge from "react-bootstrap/Badge";
import Navbar from "react-bootstrap/Navbar";
import Button from "react-bootstrap/Button";
import Profile from "../components/profile/Profile";
import ProfileModal from "../components/profile/ProfileModal";
import {
  NETWORK_NAME,
  NETWORK_ID,
  LICENSE_CONTRACT_ADDRESS,
  ACCOUNTANT_CONTRACT_ADDRESS,
  CLAIMER_CONTRACT_ADDRESS,
  COLLECTOR_CONTRACT_ADDRESS,
  PURCHASER_CONTRACT_ADDRESS,
  CERAMIC_URL,
  CONNECT_NETWORK,
  IPFS_BOOTSTRAP_PEER,
  IPFS_PRELOAD_NODE,
  THREE_ID_CONNECT_IFRAME_URL,
  THREE_ID_CONNECT_MANAGEMENT_URL,
} from "../lib/constants";
import { switchNetwork } from "../lib/wallets/connectors";
import { truncateStr } from "../lib/truncate";
import { CeramicClient } from "@ceramicnetwork/http-client";
import { ThreeIdConnect, EthereumAuthProvider } from "@3id/connect";
import * as KeyDidResolver from "key-did-resolver";
import * as ThreeIdResolver from "@ceramicnetwork/3id-did-resolver";
import { DID } from "dids";

import { ethers } from "ethers";
import { useFirebase } from "../lib/Firebase";
import { useMultiAuth } from "@ceramicstudio/multiauth";

import { Framework } from "@superfluid-finance/sdk-core";
import { setFrameworkForSdkRedux } from "@superfluid-finance/sdk-redux";

const { getIpfs, providers } = require("ipfs-provider");
const { httpClient, jsIpfs } = providers;

const AccountantABI = require("../contracts/Accountant.json");
const ETHPurchaserABI = require("../contracts/ETHPurchaser.json");
const ETHExpirationCollectorABI = require("../contracts/ETHExpirationCollector.json");
const ERC721LicenseABI = require("../contracts/ERC721License.json");
const SimpleETHClaimerABI = require("../contracts/SimpleETHClaimer.json");

function getLibrary(provider: any) {
  return new ethers.providers.Web3Provider(provider);
}

function IndexPage() {
  const [authState, activate, deactivate] = useMultiAuth();

  const [licenseContract, setLicenseContract] =
    React.useState<ethers.Contract | null>(null);
  const [accountantContract, setAccountantContract] =
    React.useState<ethers.Contract | null>(null);
  const [claimerContract, setClaimerContract] =
    React.useState<ethers.Contract | null>(null);
  const [collectorContract, setCollectorContract] =
    React.useState<ethers.Contract | null>(null);
  const [purchaserContract, setPurchaserContract] =
    React.useState<ethers.Contract | null>(null);
  const [ceramic, setCeramic] = React.useState<CeramicClient | null>(null);
  const [ipfs, setIPFS] = React.useState(null);
  const [library, setLibrary] =
    React.useState<ethers.providers.Web3Provider | null>(null);
  const { firebasePerf } = useFirebase();

  const [showProfile, setShowProfile] = React.useState(false);
  const handleCloseProfile = () => setShowProfile(false);
  const handleShowProfile = () => setShowProfile(true);

  const [pendingWithdrawAmt, setPendingWithdrawAmt] = React.useState("0");

  const connectWallet = async () => {
    const _authState = await activate();
    await switchNetwork(_authState?.provider.state.provider);

    const lib = getLibrary(_authState?.provider.state.provider);
    setLibrary(lib);

    const framework = await Framework.create({
      chainId: NETWORK_ID,
      provider: lib,
    });
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
      // Create Ceramic and DID with resolvers
      const ceramic = new CeramicClient(CERAMIC_URL);

      const resolver = {
        ...KeyDidResolver.getResolver(),
        ...ThreeIdResolver.getResolver(ceramic),
      };

      const did = new DID({ resolver });
      ceramic.setDID(did);

      // Add provider to Ceramic DID
      const threeIdConnect = new ThreeIdConnect(
        THREE_ID_CONNECT_IFRAME_URL,
        THREE_ID_CONNECT_MANAGEMENT_URL
      );

      await threeIdConnect.connect(
        new EthereumAuthProvider(
          authState.connected.provider.state.provider,
          authState.connected.accountID.address
        )
      );

      const didProvider = await threeIdConnect.getDidProvider();

      await ceramic?.did?.setProvider(didProvider);
      await ceramic?.did?.authenticate();

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

      let _accountantContract = new ethers.Contract(
        ACCOUNTANT_CONTRACT_ADDRESS,
        AccountantABI,
        library
      );
      setAccountantContract(_accountantContract);

      let _licenseContract = new ethers.Contract(
        LICENSE_CONTRACT_ADDRESS,
        ERC721LicenseABI,
        library
      );
      setLicenseContract(_licenseContract);

      let _claimerContract = new ethers.Contract(
        CLAIMER_CONTRACT_ADDRESS,
        SimpleETHClaimerABI,
        library
      );
      let _claimerContractWithSigner = _claimerContract.connect(signer);
      setClaimerContract(_claimerContractWithSigner);

      let _purchaserContract = new ethers.Contract(
        PURCHASER_CONTRACT_ADDRESS,
        ETHPurchaserABI,
        library
      );
      let _purchaserContractWithSigner = _purchaserContract.connect(signer);
      setPurchaserContract(_purchaserContractWithSigner);

      let _collectorContract = new ethers.Contract(
        COLLECTOR_CONTRACT_ADDRESS,
        ETHExpirationCollectorABI,
        library
      );
      let _collectorContractWithSigner = _collectorContract.connect(signer);
      setCollectorContract(_collectorContractWithSigner);
    }
    contractsSetup();
  }, [library]);

  const Connector = () => {
    if (authState.status !== "connected") {
      return (
        <Button
          target="_blank"
          variant="outline-primary"
          className="text-light font-weight-bold border-dark"
          style={{ height: "100px" }}
          disabled={authState.status === "connecting"}
          onClick={() => {
            connectWallet();
          }}
        >
          <img src="vector.png" width="40" style={{ marginRight: 20 }} />
          Connect Wallet
        </Button>
      );
    } else {
      return (
        <Profile
          ethBalance={ethBalance}
          account={account}
          handleShowProfile={handleShowProfile}
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
          {/*<Col sm="1" className="text-center">
             <Badge pill variant="secondary" className="py-2 px-3">
              <span style={{ fontWeight: 600 }}>TESTNET</span>
            </Badge> 
          </Col>*/}
          <Col sm="1" className="p-0">
            <FAQ />
          </Col>
          <Col sm={{ span: 8, offset: 0 }} className="text-center p-2 mx-auto">
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

          <Col sm={{ span: 2, offset: 0 }} className="p-0">
            <Connector />
          </Col>
        </Navbar>
      </Container>
      <Container fluid>
        {authState.status === "connected" ? (
          <Row>
            <Map
              licenseContract={licenseContract}
              accountantContract={accountantContract}
              claimerContract={claimerContract}
              collectorContract={collectorContract}
              purchaserContract={purchaserContract}
              account={authState.connected.accountID.address}
              ceramic={ceramic}
              ipfs={ipfs}
              firebasePerf={firebasePerf}
            ></Map>
          </Row>
        ) : (
          <Home />
        )}
      </Container>
      <ProfileModal
        ethBalance={ethBalance}
        account={account}
        showProfile={showProfile}
        handleCloseProfile={handleCloseProfile}
        deactivate={deactivate}
        pendingWithdrawAmt={pendingWithdrawAmt}
        adminContract={adminContract}
      />
    </>
  );
}

export default IndexPage;
