import * as React from "react";
import Col from "react-bootstrap/Col";
import ClaimAction from "./cards/ClaimAction";
import ClaimInfo from "./cards/ClaimInfo";
import ParcelInfo from "./cards/ParcelInfo";
import { useParcelIndexManager } from "../lib/stream-managers/ParcelIndexManager";
import { usePinningManager } from "../lib/PinningManager";
import { useBasicProfileStreamManager } from "../lib/stream-managers/BasicProfileStreamManager";
import {
  STATE_VIEWING,
  STATE_CLAIM_SELECTING,
  STATE_CLAIM_SELECTED,
  STATE_PARCEL_SELECTED,
} from "./Map";

function Sidebar({
  adminAddress,
  adminContract,
  claimerContract,
  collectorContract,
  account,
  interactionState,
  setInteractionState,
  claimBase1Coord,
  claimBase2Coord,
  selectedParcelId,
  setSelectedParcelId,
  ceramic,
  ipfs,
  firebasePerf,
}) {
  const parcelIndexManager = useParcelIndexManager(
    ceramic,
    adminContract,
    selectedParcelId
  );
  const basicProfileStreamManager =
    useBasicProfileStreamManager(parcelIndexManager);
  const pinningManager = usePinningManager(
    ceramic,
    ipfs,
    firebasePerf,
    parcelIndexManager
  );

  const [perSecondFeeNumerator, setPerSecondFeeNumerator] =
    React.useState(null);
  const [perSecondFeeDenominator, setPerSecondFeeDenominator] =
    React.useState(null);

  React.useEffect(() => {
    adminContract.perSecondFeeNumerator().then((_perSecondFeeNumerator) => {
      setPerSecondFeeNumerator(_perSecondFeeNumerator);
    });
    adminContract.perSecondFeeDenominator().then((_perSecondFeeDenominator) => {
      setPerSecondFeeDenominator(_perSecondFeeDenominator);
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
        collectorContract={collectorContract}
        interactionState={interactionState}
        setInteractionState={setInteractionState}
        selectedParcelId={selectedParcelId}
        setSelectedParcelId={setSelectedParcelId}
        perSecondFeeNumerator={perSecondFeeNumerator}
        perSecondFeeDenominator={perSecondFeeDenominator}
        adminAddress={adminAddress}
        ceramic={ceramic}
        ipfs={ipfs}
        parcelIndexManager={parcelIndexManager}
        basicProfileStreamManager={basicProfileStreamManager}
        pinningManager={pinningManager}
      ></ParcelInfo>
      {interactionState == STATE_CLAIM_SELECTING ? <ClaimInfo /> : null}
      {interactionState == STATE_CLAIM_SELECTED ? (
        <>
          <ClaimAction
            claimerContract={claimerContract}
            collectorContract={collectorContract}
            account={account}
            claimBase1Coord={claimBase1Coord}
            claimBase2Coord={claimBase2Coord}
            setInteractionState={setInteractionState}
            setSelectedParcelId={setSelectedParcelId}
            perSecondFeeNumerator={perSecondFeeNumerator}
            perSecondFeeDenominator={perSecondFeeDenominator}
            adminAddress={adminAddress}
            parcelIndexManager={parcelIndexManager}
            basicProfileStreamManager={basicProfileStreamManager}
          ></ClaimAction>
        </>
      ) : null}
    </Col>
  );
}

export default Sidebar;
