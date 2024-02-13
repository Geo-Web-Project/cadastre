import { useMemo } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAccount, useNetwork } from "wagmi";
import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  ApolloProvider,
} from "@apollo/client";
import { getContractsForChainOrThrow } from "@geo-web/sdk";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Image from "react-bootstrap/Image";
import Navbar from "react-bootstrap/Navbar";
import { useMediaQuery } from "../lib/mediaQuery";
import { useEthersSigner, useEthersProvider } from "../hooks/ethersAdapters";
import FundsRaisedCounter from "./FundsRaisedCounter";
import ConnectWallet from "./ConnectWallet";
import Profile from "./profile/Profile";
import NavMenu from "./nav/NavMenu";
import { STATE } from "./Map";
import useSuperfluid from "../hooks/superfluid";
import { NETWORK_ID, SUBGRAPH_URL } from "../lib/constants";

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
  const location = useLocation();

  const ethersSigner = useEthersSigner();
  const ethersProvider = useEthersProvider();
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { sfFramework, nativeSuperToken } = useSuperfluid();
  const { isMobile, isTablet } = useMediaQuery();

  const geoWebContracts = ethersProvider
    ? getContractsForChainOrThrow(NETWORK_ID, ethersProvider)
    : null;

  const apolloClient = useMemo(
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

  return (
    <ApolloProvider client={apolloClient}>
      {(!isMobile && !isTablet) || !isFullScreen ? (
        <Navbar
          bg="dark"
          style={{ position: "sticky", top: 0, zIndex: 10 }}
          className="w-100 border-bottom border-secondary border-opacity-25"
        >
          <Container fluid>
            <Row className="align-items-center w-100">
              <Col xl="5" className="d-none d-xl-block p-0">
                <div
                  className="d-flex align-items-center text-light ps-5"
                  style={{
                    fontSize: "2.5em",
                    fontFamily: "Abel",
                  }}
                >
                  <Image
                    style={{ height: "1.1em", marginRight: "10px" }}
                    src="logo.png"
                  />
                  <Link
                    to="/"
                    className={`position-relative ms-3 fs-1 text-decoration-none ${
                      location.pathname === "/"
                        ? "text-white"
                        : "text-info header-link"
                    }`}
                  >
                    Cadastre
                  </Link>
                  <Link
                    to="/governance"
                    className={`position-relative d-flex ms-3 fs-1 text-decoration-none ${
                      location.pathname === "/governance"
                        ? "text-white"
                        : "text-info header-link beta-link"
                    }`}
                  >
                    Governance
                    <span className="fs-4 align-self-start">BETA</span>
                  </Link>
                </div>
              </Col>
              <Col xl="2" className="d-none d-xl-block p-0">
                <FundsRaisedCounter />
              </Col>
              <Col
                xs="3"
                sm="4"
                className="d-flex justify-content-sm-start justify-content-xl-end pe-xl-1"
              >
                {location.pathname === "/" &&
                address &&
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
                ) : location.pathname === "/governance" &&
                  address &&
                  chain?.id === NETWORK_ID ? null : (
                  <ConnectWallet variant="header" />
                )}
              </Col>
              <Col xs="7" sm="5" lg="4" className="d-xl-none pe-4 ps-3">
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
            </Row>
          </Container>
        </Navbar>
      ) : null}
      <Outlet />
    </ApolloProvider>
  );
}
