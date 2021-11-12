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
import { NETWORK_ID, publishedModel } from "../lib/constants";
import BN from "bn.js";
import { createNftDidUrl } from "nft-did-resolver";
import { DIDDataStore } from "@glazed/did-datastore";

function Sidebar({
  licenseContract,
  accountantContract,
  claimerContract,
  collectorContract,
  purchaserContract,
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
  const [dataStore, setDataStore] = React.useState(null);
  React.useEffect(() => {
    if (ceramic == null) {
      console.error("Ceramic instance not found");
      return;
    }

    setDataStore(null);

    async function updateDataStore() {
      if (selectedParcelId) {
        const didNFT = createNftDidUrl({
          chainId: `eip155:${NETWORK_ID}`,
          namespace: "erc721",
          contract: licenseContract.address.toLowerCase(),
          tokenId: new BN(selectedParcelId.slice(2), "hex").toString(10),
        });
        const _dataStore = new DIDDataStore({
          ceramic,
          model: publishedModel,
          id: didNFT,
        });
        setDataStore(_dataStore);
      } else {
        setDataStore(null);
      }
    }

    updateDataStore();
  }, [ceramic, selectedParcelId]);

  const basicProfileStreamManager = useBasicProfileStreamManager(dataStore);
  const pinningManager = usePinningManager(dataStore, ipfs, firebasePerf);

  const [perSecondFeeNumerator, setPerSecondFeeNumerator] =
    React.useState(null);
  const [perSecondFeeDenominator, setPerSecondFeeDenominator] =
    React.useState(null);

  React.useEffect(() => {
    accountantContract
      .perSecondFeeNumerator()
      .then((_perSecondFeeNumerator) => {
        setPerSecondFeeNumerator(_perSecondFeeNumerator);
      });
    accountantContract
      .perSecondFeeDenominator()
      .then((_perSecondFeeDenominator) => {
        setPerSecondFeeDenominator(_perSecondFeeDenominator);
      });
  }, [accountantContract]);

  return (
    <Col
      sm="3"
      className="bg-dark px-4 text-light"
      style={{ paddingTop: "120px", overflowY: "scroll", height: "100vh" }}
    >
      <ParcelInfo
        account={account}
        collectorContract={collectorContract}
        purchaserContract={purchaserContract}
        interactionState={interactionState}
        setInteractionState={setInteractionState}
        selectedParcelId={selectedParcelId}
        setSelectedParcelId={setSelectedParcelId}
        perSecondFeeNumerator={perSecondFeeNumerator}
        perSecondFeeDenominator={perSecondFeeDenominator}
        ceramic={ceramic}
        dataStore={dataStore}
        ipfs={ipfs}
        basicProfileStreamManager={basicProfileStreamManager}
        pinningManager={pinningManager}
        licenseAddress={licenseContract.address}
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
            basicProfileStreamManager={basicProfileStreamManager}
            licenseAddress={licenseContract.address}
            ceramic={ceramic}
          ></ClaimAction>
        </>
      ) : null}
    </Col>
  );
}

export default Sidebar;
