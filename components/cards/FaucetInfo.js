import * as React from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Web3 from "web3";
import Image from "react-bootstrap/Image";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { BigNumber } from "ethers";
import { PAYMENT_TOKEN, PAYMENT_TOKEN_FAUCET_URL } from "../../lib/constants";

function FaucetInfo({ account, paymentTokenContract, adminAddress }) {
  function _mintToken() {
    paymentTokenContract.mockMint(account, Web3.utils.toWei("1000"), {
      from: account,
    });
  }

  function _approve() {
    paymentTokenContract.approve(
      adminAddress,
      BigNumber.from(2).pow(BigNumber.from(256)).sub(BigNumber.from(1)),
      { from: account }
    );
  }

  return (
    <Card border="secondary" className="bg-dark my-5">
      <Card.Body>
        <Card.Title className="text-primary font-weight-bold">
          Transaction Requirements
        </Card.Title>
        <Card.Text className="font-italic">
          <p>
            Geo Web testnet transactions require Kovan ETH & {PAYMENT_TOKEN}.
            Follow the steps below to claim tokens & provide the necessary
            authorization to successfully transact:
          </p>
          <ol className="px-3">
            <li>
              <Button
                variant="link"
                href={PAYMENT_TOKEN_FAUCET_URL}
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
                Claim {PAYMENT_TOKEN}
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
                Authorize the Cadastre to transact with your {PAYMENT_TOKEN}
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
