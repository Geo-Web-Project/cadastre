import * as React from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Image from "react-bootstrap/Image";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { ethers, BigNumber } from "ethers";
import { PAYMENT_TOKEN, PAYMENT_TOKEN_FAUCET_URL } from "../../lib/constants";

function FaucetInfo({ account, adminAddress }) {
  return (
    <Card border="secondary" className="bg-dark my-5">
      <Card.Body>
        <Card.Title className="text-primary font-weight-bold">
          Transaction Requirements
        </Card.Title>
        <Card.Text className="font-italic">
          <p>
            Geo Web testnet transactions require {PAYMENT_TOKEN}. Follow the
            steps below to claim tokens & provide the necessary authorization to
            successfully transact:
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
                Claim {PAYMENT_TOKEN}
                {""}
                <span className="text-decoration-none mx-1">
                  <Image src="link.svg" />
                </span>
              </Button>{" "}
            </li>
          </ol>
        </Card.Text>
      </Card.Body>
    </Card>
  );
}

export default FaucetInfo;
