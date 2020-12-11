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
      .mockMint(account, Web3.utils.toWei("1000"))
      .send({ from: account });
  }

  function _approve() {
    paymentTokenContract.methods
      .approve(adminAddress, new BN(2).pow(new BN(256)).subn(1))
      .send({ from: account });
  }

  return (
    <Card border="secondary" className="bg-dark my-5">
      <Card.Body>
        <Card.Title className="text-primary font-weight-bold">
          Transaction Requirements
        </Card.Title>
        <Card.Text className="font-italic">
          <p>
            Geo Web testnet transactions require Kovan ETH & GEO (Geo Web
            token). Follow the steps below to claim tokens & provide the
            necessary authorization to successfully transact:
          </p>
          <ol className="px-3">
            <li>
              <Button
                variant="link"
                href="https://faucet.kovan.network"
                target="_blank"
                rel="noreferrer"
                className="text-light font-weight-bold"
                style={{ textDecoration: "underline" }}
              >
                Claim kETH{""}
                <span className="text-decoration-none mx-1">
                  <Image src="link.svg" />
                </span>
              </Button>{" "}
              <br />- Requires a Github ID
            </li>
            <li>
              <Button
                variant="link"
                href="#"
                className="text-light font-weight-bold"
                onClick={_mintToken}
                style={{ textDecoration: "underline" }}
              >
                Claim kGEO
              </Button>{" "}
              <br />- Requires a Metamask transaction
            </li>
            <li>
              <Button
                variant="link"
                href="#"
                className="text-light text-left font-weight-bold"
                onClick={_approve}
                style={{ textDecoration: "underline" }}
              >
                Authorize the Cadastre to transact with your kGEO
              </Button>{" "}
              <br />- Requires a Metamask transaction
            </li>
          </ol>
        </Card.Text>
      </Card.Body>
    </Card>
  );
}

export default FaucetInfo;
