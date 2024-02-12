import { Outlet, Link } from "react-router-dom";
import { useAccount, useNetwork } from "wagmi";
import { getContractsForChainOrThrow } from "@geo-web/sdk";
import Container from "react-bootstrap/Container";
import Col from "react-bootstrap/Col";
import Image from "react-bootstrap/Image";
import Navbar from "react-bootstrap/NavBar";
import { useMediaQuery } from "../lib/mediaQuery";
import { useEthersSigner, useEthersProvider } from "../hooks/ethersAdapters";
import FundsRaisedCounter from "./FundsRaisedCounter";
import ConnectWallet from "./ConnectWallet";
import Profile from "./profile/Profile";
import NavMenu from "./nav/NavMenu";
import { STATE } from "./Map";
import useSuperfluid from "../hooks/superfluid";
import { NETWORK_ID } from "../lib/constants";

type HeaderProps = {
  isFullScreen: boolean;
  authStatus: string;
  portfolioNeedActionCount: number;
  setPortfolioNeedActionCount: React.Dispatch<React.SetStateAction<number>>;
  interactionState: STATE;
  setInteractionState: React.Dispatch<React.SetStateAction<STATE>>;
  setSelectedParcelId: React.Dispatch<React.SetStateAction<string>>;
  shouldRefetchParcelsData: boolean;
  setShouldRefetchParcelsData: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function Header(props: HeaderProps) {
  const { isFullScreen } = props;

  const ethersSigner = useEthersSigner();
  const ethersProvider = useEthersProvider();
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { sfFramework, nativeSuperToken } = useSuperfluid();
  const { isMobile, isTablet } = useMediaQuery();

  const geoWebContracts = ethersProvider
    ? getContractsForChainOrThrow(NETWORK_ID, ethersProvider)
    : null;

  return (
    <>
      {(!isMobile && !isTablet) || !isFullScreen ? (
        <Container fluid>
          <Navbar
            bg="dark"
            variant="dark"
            fixed="top"
            className="border-bottom border-secondary border-opacity-25"
          >
            <Col xl="3" className="d-none d-xl-block ps-5">
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
            <Col xl="5" className="d-none d-xl-block ms-5">
              <FundsRaisedCounter />
            </Col>
            <Col
              xs="3"
              sm="4"
              xl="3"
              className="d-flex justify-content-sm-start justify-content-xl-end pe-xl-3"
            >
              {address &&
              ethersSigner &&
              sfFramework &&
              geoWebContracts &&
              nativeSuperToken &&
              chain?.id === NETWORK_ID ? (
                <Profile
                  account={address.toLowerCase()}
                  signer={ethersSigner}
                  sfFramework={sfFramework}
                  registryContract={geoWebContracts.registryDiamondContract}
                  paymentToken={nativeSuperToken}
                  {...props}
                />
              ) : (
                <ConnectWallet variant="header" />
              )}
            </Col>
            <Col xs="7" sm="5" lg="4" className="d-xl-none pe-4">
              <FundsRaisedCounter />
            </Col>
            <Col
              xs="2"
              sm="3"
              lg="4"
              xl="1"
              className="d-flex justify-content-end justify-content-xl-start"
            >
              <NavMenu account={address} />
            </Col>
          </Navbar>
        </Container>
      ) : null}
      <Outlet />
    </>
  );
}
