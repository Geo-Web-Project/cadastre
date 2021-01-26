import Map from "../components/Map";
import FAQ from "../components/FAQ";
import { useState, useEffect } from "react";
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
  ADMIN_CONTRACT_ADDRESS,
} from "../lib/constants";
import CeramicClient from "@ceramicnetwork/http-client";
import { ThreeIdConnect, EthereumAuthProvider } from "3id-connect";
import { useWeb3React } from "@web3-react/core";
import { truncateStr } from "../lib/truncate";
import { InjectedConnector } from "@web3-react/injected-connector";
const geoWebAdminABI = require("../contracts/GeoWebAdmin_v0.json");
const erc20ABI = require("../contracts/ERC20Mock.json");

export const injected = new InjectedConnector({
  supportedChainIds: [NETWORK_ID],
});

function IndexPage() {
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

  const [adminContract, setAdminContract] = useState(null);
  const [paymentTokenContract, setPaymentTokenContract] = useState(null);
  const [ceramic, setCeramic] = useState(null);

  useEffect(async () => {
    if (active == false) {
      return;
    }

    const ethProvider = await connector.getProvider();
    const threeIdConnect = new ThreeIdConnect();

    const authProvider = new EthereumAuthProvider(ethProvider, account);
    await threeIdConnect.connect(authProvider);

    const ceramic = new CeramicClient("https://ceramic-clay.3boxlabs.com");
    const didProvider = await threeIdConnect.getDidProvider();

    await ceramic.setDIDProvider(didProvider);

    setCeramic(ceramic);
  }, [active, account]);

  // Setup Contracts on App Load
  useEffect(() => {
    if (library == null) {
      return;
    }
    async function contractsSetup() {
      let web3 = library;

      let _adminContract = new web3.eth.Contract(
        geoWebAdminABI,
        ADMIN_CONTRACT_ADDRESS
      );
      setAdminContract(_adminContract);

      let _paymentTokenContractAddress = await _adminContract.methods
        .paymentTokenContract()
        .call();
      setPaymentTokenContract(
        new web3.eth.Contract(erc20ABI, _paymentTokenContractAddress)
      );
    }
    contractsSetup();
  }, [library]);

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
          <Col sm="1" className="text-center">
            <Badge pill variant="secondary" className="py-2 px-3">
              <span style={{ fontWeight: 600 }}>TESTNET</span>
            </Badge>
          </Col>
          <Col sm="1" className="p-0">
            <FAQ
              account={account}
              paymentTokenContract={paymentTokenContract}
              adminAddress={ADMIN_CONTRACT_ADDRESS}
            />
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
            {active == false ? (
              <Button
                target="_blank"
                rel="noreferrer"
                variant="outline-primary"
                className="text-light font-weight-bold border-dark"
                style={{ height: "100px" }}
                onClick={() => activate(injected)}
              >
                Connect Wallet
              </Button>
            ) : (
              <Button
                target="_blank"
                rel="noreferrer"
                variant="outline-danger"
                className="text-light font-weight-bold border-dark"
                style={{ height: "100px" }}
                onClick={() => deactivate()}
              >
                Disconnect Wallet{" "}
                <Badge pill variant="secondary" className="py-2 px-3">
                  <span style={{ fontWeight: 600 }}>
                    {truncateStr(account, 20)}
                  </span>
                </Badge>
              </Button>
            )}
          </Col>
        </Navbar>
      </Container>
      <Container fluid>
        <Row>
          <Map
            account={account}
            adminContract={adminContract}
            paymentTokenContract={paymentTokenContract}
            ceramic={ceramic}
            adminAddress={ADMIN_CONTRACT_ADDRESS}
          ></Map>
        </Row>
      </Container>
    </>
  );
}

export default IndexPage;
