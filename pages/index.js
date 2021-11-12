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
import Modal from "react-bootstrap/Modal";
import {
  NETWORK_NAME,
  NETWORK_ID,
  LICENSE_CONTRACT_ADDRESS,
  ACCOUNTANT_CONTRACT_ADDRESS,
  CLAIMER_CONTRACT_ADDRESS,
  COLLECTOR_CONTRACT_ADDRESS,
  PURCHASER_CONTRACT_ADDRESS,
  CERAMIC_API_ENDPOINT,
  IPFS_BOOTSTRAP_PEER,
  IPFS_PRELOAD_NODE,
  THREE_ID_CONNECT_IFRAME_URL,
  THREE_ID_CONNECT_MANAGEMENT_URL,
} from "../lib/constants";
import CeramicClient from "@ceramicnetwork/http-client";
import { ThreeIdConnect, EthereumAuthProvider } from "@3id/connect";
import KeyDidResolver from "key-did-resolver";
import ThreeIdResolver from "@ceramicnetwork/3id-did-resolver";
import {
  Web3ReactProvider,
  useWeb3React,
  UnsupportedChainIdError,
} from "@web3-react/core";
import { truncateStr } from "../lib/truncate";
import {
  InjectedConnector,
  NoEthereumProviderError,
  UserRejectedRequestError as UserRejectedRequestErrorInjected,
} from "@web3-react/injected-connector";

import {
  URI_AVAILABLE,
  UserRejectedRequestError as UserRejectedRequestErrorWalletConnect,
} from "@web3-react/walletconnect-connector";
import { UserRejectedRequestError as UserRejectedRequestErrorFrame } from "@web3-react/frame-connector";
import { Web3Provider } from "@ethersproject/providers";
import { formatEther } from "@ethersproject/units";

import {
  injected,
  walletconnect,
  fortmatic,
  portis,
  torus,
  //network,
  //walletlink,
  //ledger,
  //trezor,
  //frame,
  //squarelink,
  //authereum
} from "../lib/wallets/connectors";
import { useEagerConnect, useInactiveListener } from "../lib/wallets/hooks";
import { Spinner } from "../components/spinner";

import { ethers } from "ethers";
import { DID } from "dids";
import { useFirebase } from "../lib/Firebase";

const { getIpfs, providers } = require("ipfs-provider");
const { httpClient, jsIpfs } = providers;

const AccountantABI = require("../contracts/Accountant.json");
const ETHPurchaserABI = require("../contracts/ETHPurchaser.json");
const ETHExpirationCollectorABI = require("../contracts/ETHExpirationCollector.json");
const ERC721LicenseABI = require("../contracts/ERC721License.json");
const SimpleETHClaimerABI = require("../contracts/SimpleETHClaimer.json");

const connectorsByName = {
  Injected: injected,
  WalletConnect: walletconnect,
  Fortmatic: fortmatic,
  Portis: portis,
  Torus: torus,
  //Network: network,
  //WalletLink: walletlink,
  //Ledger: ledger,
  //Trezor: trezor,
  //Frame: frame,
  //Squarelink: squarelink,
  //Authereum: authereum
};

function getErrorMessage(error) {
  if (error instanceof NoEthereumProviderError) {
    return "No Ethereum browser extension detected, install MetaMask on desktop or visit from a dApp browser on mobile.";
  } else if (error instanceof UnsupportedChainIdError) {
    return "You're connected to an unsupported network.";
  } else if (
    error instanceof UserRejectedRequestErrorInjected ||
    error instanceof UserRejectedRequestErrorWalletConnect ||
    error instanceof UserRejectedRequestErrorFrame
  ) {
    return "Please authorize this website to access your Ethereum account.";
  } else {
    console.error(error);
    return "An unknown error occurred. Check the console for more details.";
  }
}

function getLibrary(provider) {
  const library = new Web3Provider(provider);
  library.pollingInterval = 8000;
  return library;
}

/*
function useEagerConnect() {
  const { activate, active } = useWeb3React();

  const [tried, setTried] = React.useState(false);

  React.useEffect(() => {
    injected.isAuthorized().then((isAuthorized) => {
      if (isAuthorized) {
        activate(injected, undefined, true).catch(() => {
          setTried(true);
        });
      } else {
        setTried(true);
      }
    });
  }, []); // intentionally only running on mount (make sure it's only mounted once :))


  // if the connection worked, wait until we get confirmation of that to flip the flag
  React.useEffect(() => {
    if (!tried && active) {
      setTried(true);
    }
  }, [tried, active]);

  return tried;
}
*/

function IndexPage() {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <IndexPageContent />
    </Web3ReactProvider>
  );
}

function IndexPageContent() {
  const context = useWeb3React();
  const {
    connector,
    library,
    chainId,
    account,
    activate,
    deactivate,
    active,
    error,
  } = context;

  const triedEager = useEagerConnect();
  const [licenseContract, setLicenseContract] = React.useState(null);
  const [accountantContract, setAccountantContract] = React.useState(null);
  const [claimerContract, setClaimerContract] = React.useState(null);
  const [collectorContract, setCollectorContract] = React.useState(null);
  const [purchaserContract, setPurchaserContract] = React.useState(null);
  const [ceramic, setCeramic] = React.useState(null);
  const [ipfs, setIPFS] = React.useState(null);
  const { firebasePerf } = useFirebase();

  // handle logic to recognize the connector currently being activated
  const [activatingConnector, setActivatingConnector] = React.useState();
  React.useEffect(() => {
    console.log("running");
    if (activatingConnector && activatingConnector === connector) {
      setActivatingConnector(undefined);
    }
  }, [activatingConnector, connector]);

  // handle logic to connect in reaction to certain events on the injected ethereum provider, if it exists
  useInactiveListener(!triedEager || !!activatingConnector);

  // set up block listener
  const [blockNumber, setBlockNumber] = React.useState();

  React.useEffect(() => {
    console.log("running");
    if (library) {
      let stale = false;

      console.log("fetching block number!!");
      library
        .getBlockNumber()
        .then((blockNumber) => {
          if (!stale) {
            setBlockNumber(blockNumber);
          }
        })
        .catch(() => {
          if (!stale) {
            setBlockNumber(null);
          }
        });

      const updateBlockNumber = (blockNumber) => {
        setBlockNumber(blockNumber);
      };
      library.on("block", updateBlockNumber);

      return () => {
        library.removeListener("block", updateBlockNumber);
        stale = true;
        setBlockNumber(undefined);
      };
    }
  }, [library, chainId]);

  // fetch eth balance of the connected account
  const [ethBalance, setEthBalance] = React.useState();
  React.useEffect(() => {
    console.log("running");
    if (library && account) {
      let stale = false;

      library
        .getBalance(account)
        .then((balance) => {
          if (!stale) {
            setEthBalance(balance);
          }
        })
        .catch(() => {
          if (!stale) {
            setEthBalance(null);
          }
        });

      return () => {
        stale = true;
        setEthBalance(undefined);
      };
    }
  }, [library, account, chainId]);

  // log the walletconnect URI
  React.useEffect(() => {
    console.log("running");
    const logURI = (uri) => {
      console.log("WalletConnect URI", uri);
    };
    walletconnect.on(URI_AVAILABLE, logURI);

    return () => {
      walletconnect.off(URI_AVAILABLE, logURI);
    };
  }, []);

  React.useEffect(async () => {
    if (active == false) {
      return;
    }

    if (active && chainId === 42) {
      handleClose();
    }

    // Create Ceramic and DID with resolvers
    const ceramic = new CeramicClient(CERAMIC_API_ENDPOINT);

    const resolver = {
      ...KeyDidResolver.getResolver(),
      ...ThreeIdResolver.getResolver(ceramic),
    };

    const did = new DID({ resolver });
    ceramic.setDID(did);

    // Add provider to Ceramic DID
    const ethProvider = await connector.getProvider();
    const threeIdConnect = new ThreeIdConnect(
      THREE_ID_CONNECT_IFRAME_URL,
      THREE_ID_CONNECT_MANAGEMENT_URL
    );

    const authProvider = new EthereumAuthProvider(ethProvider, account);
    await threeIdConnect.connect(authProvider);

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
  }, [active, account]);

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

  const [show, setShow] = React.useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const WalletModal = () => {
    if (show) {
      return (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "100px",
            width: "22%",
            height: "800px",
            background: "#202333",
            color: "#FFFFFF",
            fontStyle: "normal",
            fontWeight: "normal",
          }}
        >
          {active && chainId !== NETWORK_ID ? (
            <div
              style={{
                position: "absolute",
                top: "2%",
                width: "80%",
                marginLeft: "5%",
              }}
            >
              {`Select the ${NETWORK_NAME} network in your wallet.`}
            </div>
          ) : null}

          <div
            style={{
              position: "absolute",
              right: "8%",
              top: "2%",
              fontWeight: "bold",
              cursor: "pointer",
            }}
            onClick={handleClose}
          >
            {"X"}
          </div>

          <div>
            <div
              style={{
                display: "grid",
                gridGap: "1rem",
                background: "#202333",
                color: "#FFFFFF",
                fontStyle: "normal",
                fontWeight: "normal",
                marginTop: 70,
                width: "90%",
                marginLeft: "5%",
              }}
            >
              {Object.keys(connectorsByName).map((name) => {
                const currentConnector = connectorsByName[name];
                const activating = currentConnector === activatingConnector;
                const connected = currentConnector === connector;
                const disabled =
                  !triedEager || !!activatingConnector || connected || !!error;

                return (
                  <button
                    style={{
                      height: "48px",
                      border: "none",
                      borderRadius: "2px",
                      // borderColor: activating
                      //   ? "orange"
                      //   : connected
                      //   ? "green"
                      //   : "unset",
                      cursor: disabled ? "unset" : "pointer",
                      position: "relative",
                      background:
                        active && chainId !== NETWORK_ID
                          ? "#707179"
                          : "#4B5588",
                      color: "white",
                      alignItems: "center",
                    }}
                    disabled={disabled}
                    key={name}
                    onClick={() => {
                      setActivatingConnector(currentConnector);
                      activate(connectorsByName[name]);
                    }}
                  >
                    <img
                      style={{
                        position: "absolute",
                        left: 20,
                        height: 32,
                        width: 32,
                        top: 8,
                      }}
                      src={(name === "Injected" ? "MetaMask" : name) + ".png"}
                    />

                    <span
                      style={{
                        position: "absolute",
                        textAlign: "left",
                        left: 80,
                        height: 24,
                        top: 12,
                        fontWeight: "bold",
                      }}
                    >
                      {name === "Injected" ? "MetaMask" : name}
                    </span>

                    <div
                      style={{
                        color: "black",
                        position: "absolute",
                        float: "right",
                        right: 20,
                        height: 24,
                        top: 12,
                      }}
                    >
                      {activating && (
                        <Spinner
                          color={"white"}
                          style={{ height: "25%", marginLeft: "-1rem" }}
                        />
                      )}
                      {connected && chainId !== NETWORK_ID && (
                        <span
                          role="img"
                          style={{
                            height: "12px",
                            width: "12px",
                            backgroundColor: "#ff0000",
                            borderRadius: "50%",
                            display: "inline-block",
                          }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    } else {
      return null;
    }
  };

  const Connector = () => {
    //console.debug("chainId : " + chainId);
    //console.debug("isActive : " + active);
    if (!active) {
      return (
        <Button
          target="_blank"
          rel="noreferrer"
          variant="outline-primary"
          className="text-light font-weight-bold border-dark"
          style={{ height: "100px" }}
          onClick={() => {
            //activate(injected)
            handleShow();
          }}
        >
          <img src="vector.png" width="40" style={{ marginRight: 20 }} />
          Connect Wallet
        </Button>
      );
    } else if (active && chainId !== NETWORK_ID) {
      return (
        <Button
          target="_blank"
          rel="noreferrer"
          variant="outline-danger"
          className="text-light font-weight-bold border-dark"
          style={{ height: "100px", backgroundColor: "red" }}
          onClick={() => {
            //activate(injected)
            handleShow();
          }}
        >
          <img src="vector.png" width="40" style={{ marginRight: 0 }} />
          Wrong Network
        </Button>
      );
    } else if (active && chainId === NETWORK_ID) {
      return (
        <Button
          target="_blank"
          rel="noreferrer"
          variant="outline-danger"
          className="text-light font-weight-bold border-dark"
          style={{ height: "100px" }}
          onClick={() => {
            deactivate();
          }}
        >
          Disconnect Wallet{" "}
          <Badge pill variant="secondary" className="py-2 px-3">
            <span style={{ fontWeight: 600 }}>{truncateStr(account, 20)}</span>
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

          <WalletModal />

          <Col sm={{ span: 2, offset: 0 }} className="p-0">
            <Connector />
          </Col>
        </Navbar>
      </Container>
      <Container fluid>
        {active && chainId === NETWORK_ID ? (
          <Row>
            <Map
              licenseContract={licenseContract}
              accountantContract={accountantContract}
              claimerContract={claimerContract}
              collectorContract={collectorContract}
              purchaserContract={purchaserContract}
              account={account}
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
