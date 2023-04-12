import { useState, useEffect } from "react";
import { BigNumber } from "ethers";
import Col from "react-bootstrap/Col";
import ClaimAction from "./cards/ClaimAction";
import ClaimInfo from "./cards/ClaimInfo";
import ParcelInfo from "./cards/ParcelInfo";
import { STATE, MapProps, Coord } from "./Map";
import ConnectWallet from "./ConnectWallet";
import { useMediaQuery } from "../lib/mediaQuery";

export type OffCanvasPanelProps = MapProps & {
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

function OffCanvasPanel(props: OffCanvasPanelProps) {
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

  const { isMobile, isTablet } = useMediaQuery();

  const [perSecondFeeNumerator, setPerSecondFeeNumerator] =
    useState<BigNumber | null>(null);
  const [perSecondFeeDenominator, setPerSecondFeeDenominator] =
    useState<BigNumber | null>(null);
  const [parcelFieldsToUpdate, setParcelFieldsToUpdate] =
    useState<ParcelFieldsToUpdate | null>(null);
  const [requiredBid, setRequiredBid] = useState<BigNumber>(BigNumber.from(0));
  const [minForSalePrice, setMinForSalePrice] = useState<BigNumber | null>(
    null
  );
  const [show, setShow] = useState(false);

  useEffect(() => {
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

  useEffect(() => {
    setTimeout(() => setShow(true), 500);
  }, []);

  if ((!isMobile || !isTablet) && !show && delay) {
    return null;
  }

  return (
    <Col
      sm="3"
      className={`position-absolute left-0 ${
        isMobile || isTablet ? "bottom-0" : "top-0"
      } overflow-auto ${isMobile || isTablet ? "w-100" : "w-25"} ${
        isMobile || isTablet ? "" : "vh-100"
      } bg-dark text-light px-3 pb-3`}
      style={{
        zIndex: 1,
        paddingTop: isMobile || isTablet ? "6px" : "115px",
        maxHeight: isMobile || isTablet ? "33%" : "100%",
      }}
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

export default OffCanvasPanel;
