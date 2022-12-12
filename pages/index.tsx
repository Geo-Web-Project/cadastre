import Home from "../components/Home";
import Map, { STATE } from "../components/Map";
import FAQ from "../components/FAQ";
import Profile from "../components/profile/Profile";
import FundsRaisedCounter from "../components/FundsRaisedCounter";
import FairLaunchCountdown from "../components/FairLaunchCountdown";

import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Image from "react-bootstrap/Image";
import Navbar from "react-bootstrap/Navbar";
import Button from "react-bootstrap/Button";
import NavDropdown from "react-bootstrap/NavDropdown";

import { RPC_URLS, NETWORK_ID, CERAMIC_URL } from "../lib/constants";
import { GeoWebContent } from "@geo-web/content";
import { Web3Storage } from "web3.storage";
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
import type { Point } from "@turf/turf";

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
  const [registryContract, setRegistryContract] =
    React.useState<Contracts["registryDiamondContract"] | null>(null);
  const [ceramic, setCeramic] = React.useState<CeramicClient | null>(null);
  const [ipfs, setIpfs] = React.useState<IPFS | null>(null);
  const [library, setLibrary] = React.useState<ethers.providers.Web3Provider>();
  const { firebasePerf } = useFirebase();
  const [paymentToken, setPaymentToken] =
    React.useState<NativeAssetSuperToken | undefined>(undefined);
  const [sfFramework, setSfFramework] =
    React.useState<Framework | undefined>(undefined);
  const [portfolioNeedActionCount, setPortfolioNeedActionCount] =
    React.useState(0);
  const [selectedParcelId, setSelectedParcelId] = React.useState("");
  const [interactionState, setInteractionState] =
    React.useState<STATE>(STATE.VIEWING);
  const [portfolioParcelCenter, setPortfolioParcelCenter] =
    React.useState<Point | null>(null);
  const [isPortfolioToUpdate, setIsPortfolioToUpdate] = React.useState(false);
  const [beneficiaryAddress, setBeneficiaryAddress] = React.useState("");
  const [auctionStart, setAuctionStart] =
    React.useState<BigNumber>(BigNumber.from(0));
  const [auctionEnd, setAuctionEnd] =
    React.useState<BigNumber>(BigNumber.from(0));
  const [isPreFairLaunch, setIsPreFairLaunch] = React.useState<boolean>(false);
  const [geoWebContent, setGeoWebContent] = React.useState<GeoWebContent>();

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
    async function start() {
      const { registryDiamondContract } = getContractsForChainOrThrow(
        NETWORK_ID,
        new ethers.providers.JsonRpcProvider(RPC_URLS[NETWORK_ID], NETWORK_ID)
      );

      setRegistryContract(registryDiamondContract);

      const [_auctionStart, _auctionEnd] = await Promise.all([
        registryDiamondContract.getAuctionStart(),
        registryDiamondContract.getAuctionEnd(),
      ]);

      if (!_auctionStart.isZero() || !_auctionEnd.isZero()) {
        setAuctionStart(_auctionStart);
        setAuctionEnd(_auctionEnd);
        setIsPreFairLaunch(Date.now() / 1000 < _auctionStart.toNumber());
      }

      const _beneficiaryAddress =
        await registryDiamondContract.getBeneficiary();

      setBeneficiaryAddress(_beneficiaryAddress);

      const _ipfs = await getIpfs({
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

      if (_ipfs) {
        console.log("IPFS API is provided by: " + _ipfs.provider);
        if (_ipfs.provider === "httpClient") {
          console.log("HTTP API address: " + _ipfs.apiAddress);
        }

        setIpfs(_ipfs.ipfs);
      }
    }

    start();
  }, []);

  React.useEffect(() => {
    if (!address || !signer || chain?.id !== NETWORK_ID) {
      return;
    }

    const initSession = async () => {
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
    };

    initSession();
  }, [signer]);

  React.useEffect(() => {
    if (!ceramic || !ipfs) {
      return;
    }

    const web3Storage = new Web3Storage({
      token: process.env.NEXT_PUBLIC_WEB3_STORAGE_TOKEN ?? "",
      endpoint: new URL("https://api.web3.storage"),
    });
    const geoWebContent = new GeoWebContent({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ceramic: ceramic as any,
      ipfs,
      web3Storage,
    });

    setGeoWebContent(geoWebContent);
  }, [ceramic, ipfs]);

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
                  ipfs &&
                  geoWebContent &&
                  registryContract &&
                  paymentToken &&
                  library
                ) {
                  return (
                    <Profile
                      account={address.toLowerCase()}
                      sfFramework={sfFramework}
                      ceramic={ceramic}
                      ipfs={ipfs}
                      geoWebContent={geoWebContent}
                      registryContract={registryContract}
                      disconnectWallet={disconnectWallet}
                      paymentToken={paymentToken}
                      provider={library}
                      portfolioNeedActionCount={portfolioNeedActionCount}
                      setPortfolioNeedActionCount={setPortfolioNeedActionCount}
                      setSelectedParcelId={setSelectedParcelId}
                      interactionState={interactionState}
                      setInteractionState={setInteractionState}
                      setPortfolioParcelCenter={setPortfolioParcelCenter}
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
          <Col className="ms-4 ps-3">
            <div
              className="d-flex align-items-center text-light"
              style={{
                fontSize: "2.5em",
                fontFamily: "Abel",
              }}
            >
              <Image
                style={{ height: "1.1em", marginRight: "10px" }}
                src="logo.png"
              />
              <span className="fs-1">Cadastre</span>
              <span className="fs-6 align-self-start">BETA</span>
            </div>
          </Col>
          <Col>
            {isPreFairLaunch ? (
              <FairLaunchCountdown
                auctionStart={auctionStart}
                setIsPreFairLaunch={setIsPreFairLaunch}
              />
            ) : (
              <FundsRaisedCounter beneficiaryAddress={beneficiaryAddress} />
            )}
          </Col>
          <Col className="d-flex justify-content-end align-items-center gap-3 pe-1 text-end">
            <Connector />
            <NavDropdown
              title={<Image src="more-menu.svg" alt="more-menu" width={36} />}
              id="collasible-nav-dropdown"
              menuVariant="dark"
              align="end"
            >
              <NavDropdown.Item
                href="https://faucet.paradigm.xyz/"
                target="_blank"
                rel="noopener"
                className="d-flex gap-2"
              >
                Request testnet ETH
                <Image src="open-new.svg" alt="open-new" />
              </NavDropdown.Item>
              <NavDropdown.Item
                href="https://docs.geoweb.network/"
                target="_blank"
                rel="noopener"
                className="d-flex gap-2"
              >
                Documentation
                <Image src="open-new.svg" alt="open-new" />
              </NavDropdown.Item>
              <NavDropdown.Item>
                <FAQ />
              </NavDropdown.Item>
              <div className="d-flex align-items-center">
                <NavDropdown.Item
                  href="https://discord.com/invite/reXgPru7ck"
                  target="_blank"
                  rel="noopener"
                  bsPrefix="none"
                  style={{ width: "48px", margin: "4px 0 0 16px" }}
                >
                  <Image src="discord.svg" alt="discord" />
                </NavDropdown.Item>
                <NavDropdown.Item
                  href="https://twitter.com/thegeoweb"
                  target="_blank"
                  rel="noopener"
                  bsPrefix="none"
                  style={{ width: "48px", margin: "4px 0 0 0" }}
                >
                  <Image src="twitter.svg" alt="twitter" />
                </NavDropdown.Item>
              </div>
            </NavDropdown>
          </Col>
        </Navbar>
      </Container>
      <Container fluid>
        {registryContract &&
        address &&
        library &&
        paymentToken &&
        ceramic &&
        ipfs &&
        geoWebContent &&
        firebasePerf &&
        sfFramework ? (
          <Row>
            <Map
              registryContract={registryContract}
              account={address.toLowerCase()}
              provider={library}
              ceramic={ceramic}
              ipfs={ipfs}
              geoWebContent={geoWebContent}
              firebasePerf={firebasePerf}
              paymentToken={paymentToken}
              sfFramework={sfFramework}
              disconnectWallet={disconnectWallet}
              setPortfolioNeedActionCount={setPortfolioNeedActionCount}
              selectedParcelId={selectedParcelId}
              setSelectedParcelId={setSelectedParcelId}
              interactionState={interactionState}
              setInteractionState={setInteractionState}
              portfolioParcelCenter={portfolioParcelCenter}
              isPortfolioToUpdate={isPortfolioToUpdate}
              setPortfolioParcelCenter={setPortfolioParcelCenter}
              setIsPortfolioToUpdate={setIsPortfolioToUpdate}
              isPreFairLaunch={isPreFairLaunch}
              auctionStart={auctionStart}
              auctionEnd={auctionEnd}
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
