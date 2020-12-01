import * as React from "react";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import ClaimAction from "./actions/ClaimAction";
import ClaimInfo from "./actions/ClaimInfo";

import {
  STATE_VIEWING,
  STATE_CLAIM_SELECTING,
  STATE_CLAIM_SELECTED,
  STATE_PARCEL_SELECTED,
} from "./Map";
import ParcelInfo from "./ParcelInfo";

function Sidebar({
  adminContract,
  account,
  interactionState,
  setInteractionState,
  claimBase1Coord,
  claimBase2Coord,
  selectedParcelId,
}) {
  return (
    <Col sm="3" className="bg-dark p-4 text-light">
      <Row>
        <Col sm="10">
          <h1 style={{ fontSize: "1.5rem" }}>PARCEL {selectedParcelId}</h1>
        </Col>
        <Col sm="2">
          <Button
            variant="link"
            size="sm"
            onClick={() => setInteractionState(STATE_VIEWING)}
          >
            <Image src="close.svg" />
          </Button>
        </Col>
      </Row>
      <Row>
        <ParcelInfo
          interactionState={interactionState}
          selectedParcelId={selectedParcelId}
        ></ParcelInfo>
      </Row>
      {interactionState == STATE_CLAIM_SELECTING ? <ClaimInfo /> : null}
      {interactionState == STATE_CLAIM_SELECTED ? (
        <ClaimAction
          adminContract={adminContract}
          account={account}
          claimBase1Coord={claimBase1Coord}
          claimBase2Coord={claimBase2Coord}
        ></ClaimAction>
      ) : null}
    </Col>
  );
}

export default Sidebar;
