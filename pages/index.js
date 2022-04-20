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
import { truncateStr } from "../lib/truncate";
import { CeramicClient } from "@ceramicnetwork/http-client";
import { ThreeIdConnect, EthereumAuthProvider } from "@3id/connect";
import * as KeyDidResolver from "key-did-resolver";
import * as ThreeIdResolver from "@ceramicnetwork/3id-did-resolver";
import { DID } from "dids";

import { ethers } from "ethers";
import { useFirebase } from "../lib/Firebase";
import { useMultiAuth } from "@ceramicstudio/multiauth";
import { useViewerConnection } from "@self.id/framework";

const { getIpfs, providers } = require("ipfs-provider");
const { httpClient, jsIpfs } = providers;

const AccountantABI = require("../contracts/Accountant.json");
const ETHPurchaserABI = require("../contracts/ETHPurchaser.json");
const ETHExpirationCollectorABI = require("../contracts/ETHExpirationCollector.json");
const ERC721LicenseABI = require("../contracts/ERC721License.json");
const SimpleETHClaimerABI = require("../contracts/SimpleETHClaimer.json");

function getLibrary(provider) {
  return new ethers.providers.Web3Provider(provider);
}

function IndexPage() {
  const [authState, activate, deactivate] = useMultiAuth();
  const [connection, connect, disconnect] = useViewerConnection();

  // const triedEager = useEagerConnect();
  const [licenseContract, setLicenseContract] = React.useState(null);
  const [accountantContract, setAccountantContract] = React.useState(null);
  const [claimerContract, setClaimerContract] = React.useState(null);
  const [collectorContract, setCollectorContract] = React.useState(null);
  const [purchaserContract, setPurchaserContract] = React.useState(null);
  const [ceramic, setCeramic] = React.useState(null);
  const [ipfs, setIPFS] = React.useState(null);
  const [library, setLibrary] = React.useState(null);
  const { firebasePerf } = useFirebase();

  const connectWallet = async () => {
    const _authState = await activate();
    // await connect(
    //   new EthereumAuthProvider(
    //     _authState.provider.state.provider,
    //     _authState.accountID.toString()
    //   )
    // );
  };

  const disconnectWallet = async () => {
    await disconnect();
    await deactivate();
  };

  React.useEffect(() => {
    if (!authState.connected) {
      return;
    }

    const start = async () => {
      setLibrary(getLibrary(authState.connected.provider.state.provider));

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

      await ceramic.did.setProvider(didProvider);
      await ceramic.did.authenticate();

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
    if (library == null) {
      return;
    }
    async function contractsSetup() {
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
    if (!authState.connected) {
      return (
        <Button
          target="_blank"
          rel="noreferrer"
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
    }
    // else if (active && chainId !== NETWORK_ID) {
    //   return (
    //     <Button
    //       target="_blank"
    //       rel="noreferrer"
    //       variant="outline-danger"
    //       className="text-light font-weight-bold border-dark"
    //       style={{ height: "100px", backgroundColor: "red" }}
    //       onClick={() => {
    //         //activate(injected)
    //         handleShow();
    //       }}
    //     >
    //       <img src="vector.png" width="40" style={{ marginRight: 0 }} />
    //       Wrong Network
    //     </Button>
    //   );
    // }
    else {
      return (
        <Button
          target="_blank"
          rel="noreferrer"
          variant="outline-danger"
          className="text-light font-weight-bold border-dark"
          style={{ height: "100px" }}
          onClick={() => {
            disconnectWallet();
          }}
        >
          Disconnect Wallet{" "}
          <Badge pill variant="secondary" className="py-2 px-3">
            <span style={{ fontWeight: 600 }}>
              {truncateStr(authState.connected.accountID.toString(), 20)}
            </span>
          </Badge>
        </Button>
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
        {authState.connected ? (
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
    </>
  );
}

export default IndexPage;
