import * as React from "react";
import Col from "react-bootstrap/Col";
import ClaimAction from "./cards/ClaimAction";
import ClaimInfo from "./cards/ClaimInfo";
import ParcelInfo from "./cards/ParcelInfo";
import { usePinningManager } from "../lib/PinningManager";
import { useBasicProfileStreamManager } from "../lib/stream-managers/BasicProfileStreamManager";
import { STATE, MapProps } from "./Map";
import { NETWORK_ID, publishedModel } from "../lib/constants";
import BN from "bn.js";
import { createNftDidUrl } from "nft-did-resolver";
import { DIDDataStore } from "@glazed/did-datastore";
import { BigNumber } from "ethers";

export type SidebarProps = MapProps & {
  interactionState: STATE;
  setInteractionState: React.Dispatch<React.SetStateAction<STATE>>;
  claimBase1Coord: any;
  claimBase2Coord: any;
  selectedParcelId: string;
  setSelectedParcelId: React.Dispatch<React.SetStateAction<string>>;
};

function Sidebar({
  auctionSuperApp,
  licenseContract,
  account,
  ceramic,
  ipfs,
  firebasePerf,
  interactionState,
  setInteractionState,
  claimBase1Coord,
  claimBase2Coord,
  selectedParcelId,
  setSelectedParcelId,
}: SidebarProps) {
  const [dataStore, setDataStore] = React.useState<DIDDataStore | null>(null);
  React.useEffect(() => {
    if (ceramic == null) {
      console.error("Ceramic instance not found");
      return;
    }

    setDataStore(null);

    async function updateDataStore() {
      if (selectedParcelId) {
        const _dataStore = new DIDDataStore({
          ceramic,
          model: publishedModel,
        });
        setDataStore(_dataStore);
      } else {
        setDataStore(null);
      }
    }

    updateDataStore();
  }, [ceramic, selectedParcelId]);

  const didNFT = selectedParcelId
    ? createNftDidUrl({
        chainId: `eip155:${NETWORK_ID}`,
        namespace: "erc721",
        contract: licenseContract.address.toLowerCase(),
        tokenId: new BN(selectedParcelId.slice(2), "hex").toString(10),
      })
    : null;
  const basicProfileStreamManager = useBasicProfileStreamManager(
    dataStore,
    didNFT
  );
  const pinningManager = usePinningManager(
    dataStore,
    didNFT,
    ipfs,
    firebasePerf
  );

  const [perSecondFeeNumerator, setPerSecondFeeNumerator] =
    React.useState<BigNumber | null>(null);
  const [perSecondFeeDenominator, setPerSecondFeeDenominator] =
    React.useState<BigNumber | null>(null);

  React.useEffect(() => {
    auctionSuperApp.perSecondFeeNumerator().then((_perSecondFeeNumerator) => {
      setPerSecondFeeNumerator(_perSecondFeeNumerator);
    });
    auctionSuperApp
      .perSecondFeeDenominator()
      .then((_perSecondFeeDenominator) => {
        setPerSecondFeeDenominator(_perSecondFeeDenominator);
      });
  }, [auctionSuperApp]);

  return (
    <Col
      sm="3"
      className="bg-dark px-4 text-light"
      style={{ paddingTop: "120px", overflowY: "scroll", height: "100vh" }}
    >
      <ParcelInfo
        account={account}
        interactionState={interactionState}
        setInteractionState={setInteractionState}
        selectedParcelId={selectedParcelId}
        setSelectedParcelId={setSelectedParcelId}
        perSecondFeeNumerator={perSecondFeeNumerator}
        perSecondFeeDenominator={perSecondFeeDenominator}
        ceramic={ceramic}
        dataStore={dataStore}
        ipfs={ipfs}
        didNFT={didNFT}
        basicProfileStreamManager={basicProfileStreamManager}
        pinningManager={pinningManager}
        licenseAddress={licenseContract.address}
      ></ParcelInfo>
      {interactionState == STATE.CLAIM_SELECTING ? <ClaimInfo /> : null}
      {interactionState == STATE.CLAIM_SELECTED ? (
        <>
          {/* <ClaimAction
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
          ></ClaimAction> */}
        </>
      ) : null}
    </Col>
  );
}

export default Sidebar;
