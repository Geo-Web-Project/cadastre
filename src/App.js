import Map from "./components/Map";
import { useState, useEffect } from "react";
import "./App.scss";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Web3 from "web3";

const geoWebAdminABI = require("./contracts/GeoWebAdmin.json");
const adminAddress = "0xa2328e6dDE846b98333701A5CcF51B31062ac201";

function App() {
  const [adminContract, setAdminContract] = useState(null);
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
        web3.eth.net.getNetworkType().then((network) => {
          if (network !== "kovan")
            alert("Please Switch to Kovan to use this DApp");
        });
      } catch (e) {
        // User has denied account access to DApp...
      }
    }
    // Legacy DApp Browsers
    else if (window.web3) {
      web3 = new Web3(window.web3.currentProvider);
      web3.eth.net.getNetworkType().then((network) => {
        if (network !== "kovan")
          alert("Please Switch to Kovan to use this DApp");
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
      setAdminContract(new web3.eth.Contract(geoWebAdminABI, adminAddress));
    }
    contractsSetup();
  }, []);

  return (
    <Container fluid>
      <Row className="bg-dark border-bottom" style={{ height: "80px" }}></Row>
      <Row>
        <Map account={account} adminContract={adminContract}></Map>
      </Row>
    </Container>
  );
}

export default App;
