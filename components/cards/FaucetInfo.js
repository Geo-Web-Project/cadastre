import * as React from "react";
import Card from "react-bootstrap/Card";
import { PAYMENT_TOKEN, PAYMENT_TOKEN_FAUCET_URL } from "../../lib/constants";

function FaucetInfo() {
  return (
    <Card border="secondary" className="bg-dark my-5">
      <Card.Body>
        <Card.Title className="text-primary font-weight-bold">
          Claim {PAYMENT_TOKEN}
        </Card.Title>
        <Card.Text className="font-italic">
          You need {PAYMENT_TOKEN} to transact on this Cadastre Testnet.
        </Card.Text>
        <Card.Text className="font-italic">
          Get free {PAYMENT_TOKEN} from this{" "}
          <a href={PAYMENT_TOKEN_FAUCET_URL} target="_blank" rel="noreferrer">
            faucet.
          </a>
        </Card.Text>
      </Card.Body>
    </Card>
  );
}

export default FaucetInfo;
