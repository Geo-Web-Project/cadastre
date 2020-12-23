import Map from "./components/Map";
import { useState, useEffect } from "react";
import "./App.scss";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Web3 from "web3";
import Col from "react-bootstrap/Col";
import Image from "react-bootstrap/Image";
import Badge from "react-bootstrap/Badge";
import Navbar from "react-bootstrap/Navbar";
import { NETWORK_NAME, NETWORK_ID, ADMIN_CONTRACT_ADDRESS } from "./constants";

const geoWebAdminABI = require("./contracts/GeoWebAdmin_v0.json");
const erc20ABI = require("./contracts/ERC20Mock.json");

function App() {
  const [adminContract, setAdminContract] = useState(null);
  const [paymentTokenContract, setPaymentTokenContract] = useState(null);
  const [account, setAccount] = useState(null);

  // Setup Web3
  let web3;
  const setupWeb3 = async () => {
    if (window.ethereum) {
      web3 = new Web3(window.ethereum);
      try {
        await window.ethereum.enable();
        // User has allowed account access to DApp...
        setAccount(window.web3.eth.defaultAccount);
        web3.eth.net.getId().then((networkId) => {
          if (networkId != NETWORK_ID)
            alert(`Please Switch to ${NETWORK_NAME} to use this DApp`);
        });
      } catch (e) {
        // User has denied account access to DApp...
      }
    }
    // Legacy DApp Browsers
    else if (window.web3) {
      web3 = new Web3(window.web3.currentProvider);
      web3.eth.net.getId().then((networkId) => {
        if (networkId != NETWORK_ID)
          alert(`Please Switch to ${NETWORK_NAME} to use this DApp`);
      });
    }
    // Non-DApp Browsers
    else {
      alert("You have to install MetaMask !");
    }
  };

  // Setup Contracts on App Load
  useEffect(() => {
    async function contractsSetup() {
      setupWeb3();

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
  }, []);

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
          <Col sm="10" className="text-center p-2">
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
        </Navbar>
      </Container>
      <Container fluid>
        <Row>
          <Map
            account={account}
            adminContract={adminContract}
            paymentTokenContract={paymentTokenContract}
            adminAddress={ADMIN_CONTRACT_ADDRESS}
          ></Map>
        </Row>
      </Container>
    </>
  );
}

export default App;
