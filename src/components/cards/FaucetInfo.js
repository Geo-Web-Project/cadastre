import * as React from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Web3 from "web3";
import Image from "react-bootstrap/Image";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import BN from "bn.js";

function FaucetInfo({ account, paymentTokenContract, adminAddress }) {
  function _mintToken() {
    paymentTokenContract.methods
      .mockMint(account, Web3.utils.toWei("10"))
      .send({ from: account });
  }

  function _approve() {
    paymentTokenContract.methods
      .approve(adminAddress, new BN(2).pow(new BN(256)).subn(1))
      .send({ from: account });
  }

  return (
    <Card border="secondary" className="bg-dark mt-5">
      <Card.Body>
        <Card.Text>
          <h5 className="text-center font-weight-bold">Faucet Links</h5>
          <p className="font-italic">
            Kovan ETH and GEO are required for Geo Web testnet transactions.
            First claim ETH (requires a Github ID) then kGEO (via a Metamask
            transaction) from the links below:
          </p>
          <Row className="text-center">
            <Col>
              <Button
                variant="link"
                href="https://faucet.kovan.network"
                target="_blank"
                rel="noreferrer"
                className="text-light"
                style={{ textDecoration: "underline" }}
              >
                Get ETH{""}
                <span className="text-decoration-none mx-1">
                  <Image src="link.svg" />
                </span>
              </Button>
            </Col>
            <Col>
              <Button
                variant="link"
                href="#"
                className="text-light"
                onClick={_mintToken}
                style={{ textDecoration: "underline" }}
              >
                Get GEO
              </Button>
            </Col>
          </Row>
          <Row className="text-center">
            <Col>
              <Button
                variant="link"
                href="#"
                className="text-light"
                onClick={_approve}
                style={{ textDecoration: "underline" }}
              >
                Approve GEO
              </Button>
            </Col>
          </Row>
        </Card.Text>
      </Card.Body>
    </Card>
  );
}

export default FaucetInfo;
