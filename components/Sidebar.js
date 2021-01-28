import * as React from "react";
import Col from "react-bootstrap/Col";
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
  paymentTokenContract,
  interactionState,
  setInteractionState,
  claimBase1Coord,
  claimBase2Coord,
  selectedParcelId,
  setSelectedParcelId,
  ceramic,
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
      <ParcelInfo
        account={account}
        adminContract={adminContract}
        interactionState={interactionState}
        setInteractionState={setInteractionState}
        selectedParcelId={selectedParcelId}
        setSelectedParcelId={setSelectedParcelId}
        perSecondFeeNumerator={perSecondFeeNumerator}
        perSecondFeeDenominator={perSecondFeeDenominator}
        paymentTokenContract={paymentTokenContract}
        adminAddress={adminAddress}
        ceramic={ceramic}
      ></ParcelInfo>
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
            paymentTokenContract={paymentTokenContract}
            adminAddress={adminAddress}
            ceramic={ceramic}
          ></ClaimAction>
        </>
      ) : null}
    </Col>
  );
}

export default Sidebar;
