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
  setInteractionState,
  claimBase1Coord,
  claimBase2Coord,
}) {
  return (
    <Col sm="3" className="bg-dark p-4 text-light">
      <>
        <h1 style={{ "font-size": "1.5rem" }}>PARCEL ID</h1>
        <p>Unclaimed Coordinates</p>
      </>
      {interactionState == STATE_CLAIM_SELECTED ? (
        <ClaimAction
          adminContract={adminContract}
          account={account}
          claimBase1Coord={claimBase1Coord}
          claimBase2Coord={claimBase2Coord}
          setInteractionState={setInteractionState}
        ></ClaimAction>
      ) : null}
    </Col>
  );
}

export default Sidebar;
