import * as React from "react";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import ClaimAction from "./actions/ClaimAction";
import {
  STATE_VIEWING,
  STATE_CLAIM_SELECTING,
  STATE_CLAIM_SELECTED,
} from "./Map";

function Sidebar({
  adminContract,
  account,
  interactionState,
  claimBase1Coord,
  claimBase2Coord,
}) {
  return (
    <Col sm="3" className="bg-dark p-4 text-light">
      {(interactionState == STATE_CLAIM_SELECTING) |
      (interactionState == STATE_CLAIM_SELECTED) ? (
        <>
          <h1 style={{ "font-size": "1.5rem" }}>PARCEL ID</h1>
          <p>Unclaimed Coordinates</p>
        </>
      ) : null}
      {interactionState == STATE_CLAIM_SELECTED ? (
        <>
          <Button variant="primary" className="w-100">
            Claim
          </Button>
          <ClaimAction
            adminContract={adminContract}
            account={account}
            claimBase1Coord={claimBase1Coord}
            claimBase2Coord={claimBase2Coord}
          ></ClaimAction>
        </>
      ) : null}
    </Col>
  );
}

export default Sidebar;
