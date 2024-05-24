import { useMemo } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
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
import Stack from "react-bootstrap/Stack";
import NavDropdown from "react-bootstrap/NavDropdown";
import Image from "react-bootstrap/Image";
import Navbar from "react-bootstrap/Navbar";
import Logo from "../../assets/logo.png";
import ExpandMoreIcon from "../../assets/expand-more.svg";
import { useMediaQuery } from "../../hooks/mediaQuery";
import { useEthersSigner, useEthersProvider } from "../../hooks/ethersAdapters";
import FundsRaisedCounter from "./FundsRaisedCounter";
import ConnectWallet from "./ConnectWallet";
import CadastreProfile from "../cadastre/profile/Profile";
import GovernanceProfile from "../governance/Profile";
import NavMenu from "./NavMenu";
import { STATE } from "../cadastre/Map";
import useSuperfluid from "../../hooks/superfluid";
import { NETWORK_ID, SUBGRAPH_URL } from "../../lib/constants";

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
  const navigate = useNavigate();

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
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            height: !isMobile ? 89 : 62,
          }}
          className="w-100 border-bottom border-secondary border-opacity-25"
        >
          <Container fluid className="pe-0">
            <Row
              className="align-items-center justify-content-between"
              style={{ width: "100vw" }}
            >
              <Col
                xs="7"
                className="d-flex align-items-center gap-2 d-xl-none p-0"
              >
                <Image
                  src={Logo}
                  className="ps-4"
                  style={{ fontSize: "2.5rem", height: "1.1em" }}
                />
                <NavDropdown
                  bsPrefix="dropdown-custom-arrow"
                  title={
                    <Stack
                      direction="horizontal"
                      className="align-self-center align-items-center text-white fs-3"
                      style={{
                        fontFamily: "Abel",
                      }}
                    >
                      {location.pathname === "/" ? "Cadastre" : "Governance"}
                      <Image src={ExpandMoreIcon} alt="pages" width={22} />
                    </Stack>
                  }
                  menuVariant="dark"
                  align="end"
                >
                  <NavDropdown.Item onClick={() => navigate("/")}>
                    Cadastre
                  </NavDropdown.Item>
                  <NavDropdown.Item onClick={() => navigate("/governance")}>
                    Governance
                  </NavDropdown.Item>
                </NavDropdown>
              </Col>
              <Col xl="5" xxl="4" className="d-none d-xl-block p-0">
                <div
                  className="d-flex align-items-center text-light ps-4"
                  style={{
                    fontSize: "2.5em",
                    fontFamily: "Abel",
                  }}
                >
                  <Image
                    style={{ height: "1.1em", marginRight: "10px" }}
                    src={Logo}
                  />
                  <Link
                    to="/"
                    className={`position-relative ms-2 fs-3 text-decoration-none ${
                      location.pathname === "/"
                        ? "text-white"
                        : "text-info header-link"
                    }`}
                  >
                    Cadastre
                  </Link>
                  <Link
                    to="/governance"
                    className={`position-relative d-flex ms-4 fs-3 text-decoration-none ${
                      location.pathname.startsWith("/governance")
                        ? "text-white"
                        : "text-info header-link beta-link"
                    }`}
                  >
                    Governance
                    <span className="fs-5 align-self-start">BETA</span>
                  </Link>
                </div>
              </Col>
              <Col xl="3" xx="4" className="d-none d-xl-block p-0">
                <FundsRaisedCounter />
              </Col>
              <Col
                xs="3"
                sm="4"
                xl="4"
                className="d-flex justify-content-end px-0 pe-0 pe-xl-1"
              >
                {location.pathname === "/" &&
                address &&
                ethersSigner &&
                sfFramework &&
                geoWebContracts &&
                nativeSuperToken &&
                chain?.id === NETWORK_ID ? (
                  <CadastreProfile
                    account={address.toLowerCase()}
                    signer={ethersSigner}
                    sfFramework={sfFramework}
                    registryContract={geoWebContracts.registryDiamondContract}
                    paymentToken={nativeSuperToken}
                    {...props}
                  />
                ) : location.pathname.startsWith("/governance") &&
                  address &&
                  chain?.id === NETWORK_ID ? (
                  <GovernanceProfile />
                ) : (
                  <ConnectWallet variant="header" />
                )}
                <div className="d-none d-xl-block">
                  <NavMenu account={address} />
                </div>
              </Col>
              <Col
                xs="2"
                sm="1"
                xl="4"
                className="d-flex d-xl-none justify-content-end p-0"
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
