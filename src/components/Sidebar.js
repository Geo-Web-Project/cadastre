import * as React from "react";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import ClaimAction from "./cards/ClaimAction";
import ClaimInfo from "./cards/ClaimInfo";
import ParcelInfo from "./cards/ParcelInfo";
import BN from "bn.js";

import {
  STATE_VIEWING,
  STATE_CLAIM_SELECTING,
  STATE_CLAIM_SELECTED,
  STATE_PARCEL_SELECTED,
} from "./Map";

function Sidebar({
  adminAddress,
  adminContract,
  account,
  interactionState,
  setInteractionState,
  claimBase1Coord,
  claimBase2Coord,
  selectedParcelId,
  setSelectedParcelId,
}) {
  const [perSecondFeeNumerator, setPerSecondFeeNumerator] = React.useState(
    null
  );
  const [perSecondFeeDenominator, setPerSecondFeeDenominator] = React.useState(
    null
  );

  React.useEffect(() => {
    adminContract.methods
      .perSecondFeeNumerator()
      .call()
      .then((_perSecondFeeNumerator) => {
        setPerSecondFeeNumerator(new BN(_perSecondFeeNumerator));
      });
    adminContract.methods
      .perSecondFeeDenominator()
      .call()
      .then((_perSecondFeeDenominator) => {
        setPerSecondFeeDenominator(new BN(_perSecondFeeDenominator));
      });
  }, [adminContract]);

  return (
    <Col
      sm="3"
      className="bg-dark px-4 text-light"
      style={{ paddingTop: "120px", overflowY: "scroll", height: "100vh" }}
    >
      <Row className="mb-3">
        <Col sm="10">
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            PARCEL {selectedParcelId}
          </h1>
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
          account={account}
          adminContract={adminContract}
          interactionState={interactionState}
          setInteractionState={setInteractionState}
          selectedParcelId={selectedParcelId}
          setSelectedParcelId={setSelectedParcelId}
          perSecondFeeNumerator={perSecondFeeNumerator}
          perSecondFeeDenominator={perSecondFeeDenominator}
          adminAddress={adminAddress}
        ></ParcelInfo>
      </Row>
      {interactionState == STATE_CLAIM_SELECTING ? <ClaimInfo /> : null}
      {interactionState == STATE_CLAIM_SELECTED ? (
        <>
          <ClaimAction
            adminContract={adminContract}
            account={account}
            claimBase1Coord={claimBase1Coord}
            claimBase2Coord={claimBase2Coord}
            setInteractionState={setInteractionState}
            setSelectedParcelId={setSelectedParcelId}
            perSecondFeeNumerator={perSecondFeeNumerator}
            perSecondFeeDenominator={perSecondFeeDenominator}
            adminAddress={adminAddress}
          ></ClaimAction>
        </>
      ) : null}
    </Col>
  );
}

export default Sidebar;
