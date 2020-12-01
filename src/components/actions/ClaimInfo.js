import * as React from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Web3 from "web3";
import Image from "react-bootstrap/Image";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

function ClaimInfo() {
  return (
    <Card className="bg-purple text-light">
      <Card.Body>
        <Card.Text>
          <h5>Claim Instructions</h5>
          <p>
            Resize your land parcel claim by moving your mouse. Your claim
            cannot overlap with an existing claim.
          </p>
          <p>
            Click once to lock in the shape of your claim. You will complete
            your claim details in a form shown in this panel.
          </p>
          <p>Hit ESC to exit claim mode.</p>
        </Card.Text>
      </Card.Body>
    </Card>
  );
}

export default ClaimInfo;
