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
          Claim {PAYMENT_TOKEN}
        </Card.Title>
        <Card.Text className="font-italic">
          <p>You need {PAYMENT_TOKEN} to transact on this Cadastre Testnet.</p>
          <p>
            Get free {PAYMENT_TOKEN} from the{" "}
            <a href={PAYMENT_TOKEN_FAUCET_URL} target="_blank" rel="noreferrer">
              Faucet with your Github ID.
            </a>
          </p>
        </Card.Text>
      </Card.Body>
    </Card>
  );
}

export default FaucetInfo;
