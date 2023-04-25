import * as React from "react";
import Col from "react-bootstrap/Col";
import ClaimAction from "./cards/ClaimAction";
import ClaimInfo from "./cards/ClaimInfo";
import ParcelInfo from "./cards/ParcelInfo";
import { STATE, MapProps, Coord } from "./Map";
import { BigNumber } from "ethers";
import ConnectWallet from "./ConnectWallet";

export type SidebarProps = MapProps & {
  claimBase1Coord: Coord | null;
  claimBase2Coord: Coord | null;
  selectedParcelId: string;
  setSelectedParcelId: React.Dispatch<React.SetStateAction<string>>;
  setIsParcelAvailable: React.Dispatch<React.SetStateAction<boolean>>;
  selectedParcelCoords: Coord | null;
  parcelClaimSize: number;
  invalidLicenseId: string;
  setInvalidLicenseId: React.Dispatch<React.SetStateAction<string>>;
  setNewParcel: React.Dispatch<
    React.SetStateAction<{ id: string; timerId: number | null }>
  >;
  delay: boolean;
};

export interface ParcelFieldsToUpdate {
  forSalePrice: boolean;
  licenseOwner: boolean;
}

function Sidebar(props: SidebarProps) {
  const {
    account,
    signer,
    registryContract,
    interactionState,
    setInteractionState,
    parcelClaimSize,
    selectedParcelId,
    selectedParcelCoords,
    delay,
  } = props;

  const [perSecondFeeNumerator, setPerSecondFeeNumerator] =
    React.useState<BigNumber | null>(null);
  const [perSecondFeeDenominator, setPerSecondFeeDenominator] =
    React.useState<BigNumber | null>(null);
  const [parcelFieldsToUpdate, setParcelFieldsToUpdate] =
    React.useState<ParcelFieldsToUpdate | null>(null);

  React.useEffect(() => {
    registryContract
      .getPerSecondFeeNumerator()
      .then((_perSecondFeeNumerator) => {
        setPerSecondFeeNumerator(_perSecondFeeNumerator);
      });
    registryContract
      .getPerSecondFeeDenominator()
      .then((_perSecondFeeDenominator) => {
        setPerSecondFeeDenominator(_perSecondFeeDenominator);
      });
    registryContract.getMinForSalePrice().then((_minForSalePrice) => {
      setMinForSalePrice(_minForSalePrice);
    });
    registryContract.requiredBid().then((_requiredBid) => {
      setRequiredBid(_requiredBid);
    });
  }, [registryContract]);

  const [requiredBid, setRequiredBid] = React.useState<BigNumber>(
    BigNumber.from(0)
  );
  const [minForSalePrice, setMinForSalePrice] =
    React.useState<BigNumber | null>(null);
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    setTimeout(() => setShow(true), 500);
  }, []);

  if (!show && delay) {
    return null;
  }

  return (
    <Col
      sm="3"
      className="position-absolute left-0 top-0 overflow-auto w-25 vh-100 bg-dark px-4 text-light"
      style={{ zIndex: 1, paddingTop: "120px" }}
    >
      {perSecondFeeNumerator && perSecondFeeDenominator && minForSalePrice ? (
        <ParcelInfo
          {...props}
          perSecondFeeNumerator={perSecondFeeNumerator}
          perSecondFeeDenominator={perSecondFeeDenominator}
          minForSalePrice={minForSalePrice}
          selectedParcelCoords={selectedParcelCoords}
          parcelFieldsToUpdate={parcelFieldsToUpdate}
          setParcelFieldsToUpdate={setParcelFieldsToUpdate}
          licenseAddress={registryContract.address}
          key={selectedParcelId}
        ></ParcelInfo>
      ) : null}
      {interactionState == STATE.CLAIM_SELECTING ? (
        <ClaimInfo
          setInteractionState={setInteractionState}
          parcelClaimSize={parcelClaimSize}
        />
      ) : null}
      {interactionState === STATE.CLAIM_SELECTED && !account ? (
        <ConnectWallet variant="claim" />
      ) : interactionState === STATE.CLAIM_SELECTED &&
        account &&
        signer &&
        perSecondFeeNumerator &&
        perSecondFeeDenominator &&
        minForSalePrice ? (
        <ClaimAction
          {...props}
          signer={signer}
          licenseAddress={registryContract.address}
          perSecondFeeNumerator={perSecondFeeNumerator}
          perSecondFeeDenominator={perSecondFeeDenominator}
          requiredBid={requiredBid}
          minForSalePrice={minForSalePrice}
          setParcelFieldsToUpdate={setParcelFieldsToUpdate}
        ></ClaimAction>
      ) : null}
    </Col>
  );
}

export default Sidebar;
