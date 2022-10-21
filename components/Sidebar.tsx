import * as React from "react";
import Col from "react-bootstrap/Col";
import ClaimAction from "./cards/ClaimAction";
import ClaimInfo from "./cards/ClaimInfo";
import ParcelInfo from "./cards/ParcelInfo";
import { STATE, MapProps, Coord } from "./Map";
import { BigNumber } from "ethers";
import FairLaunchInfo from "./cards/FairLaunchInfo";

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
};

export interface ParcelFieldsToUpdate {
  forSalePrice: boolean;
  licenseOwner: boolean;
}

function Sidebar(props: SidebarProps) {
  const {
    registryContract,
    interactionState,
    setInteractionState,
    parcelClaimSize,
    selectedParcelCoords,
    minForSalePrice,
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
  }, [registryContract]);

  const [startingBid, setStartingBid] = React.useState<BigNumber | null>(null);
  const [endingBid, setEndingBid] = React.useState<BigNumber | null>(null);
  const [auctionStart, setAuctionStart] = React.useState<BigNumber | null>(
    null
  );
  const [auctionEnd, setAuctionEnd] = React.useState<BigNumber | null>(null);
  const [requiredBid, setRequiredBid] =
    React.useState<BigNumber>(minForSalePrice);

  React.useEffect(() => {
    let isMounted = true;

    (async () => {
      const [_startingBid, _endingBid, _auctionStart, _auctionEnd] =
        await Promise.all([
          registryContract.getStartingBid(),
          registryContract.getEndingBid(),
          registryContract.getAuctionStart(),
          registryContract.getAuctionEnd(),
        ]);
      if (_auctionStart.isZero() || _auctionEnd.isZero()) {
        return;
      }
      if (isMounted) {
        setStartingBid(_startingBid);
        setEndingBid(_endingBid);
        setAuctionStart(_auctionStart);
        setAuctionEnd(_auctionEnd);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [registryContract]);

  const isFairLaunch =
    auctionStart &&
    auctionEnd &&
    startingBid &&
    endingBid &&
    Date.now() / 1000 < auctionEnd.toNumber();

  return (
    <Col
      sm="3"
      className="bg-dark px-4 text-light"
      style={{ paddingTop: "120px", overflowY: "scroll", height: "100vh" }}
    >
      {isFairLaunch && interactionState == STATE.CLAIM_SELECTED ? (
        <FairLaunchInfo
          auctionStart={auctionStart}
          auctionEnd={auctionEnd}
          startingBid={startingBid}
          endingBid={endingBid}
          requiredBid={requiredBid}
          setRequiredBid={setRequiredBid}
          {...props}
        />
      ) : perSecondFeeNumerator && perSecondFeeDenominator ? (
        <ParcelInfo
          {...props}
          perSecondFeeNumerator={perSecondFeeNumerator}
          perSecondFeeDenominator={perSecondFeeDenominator}
          selectedParcelCoords={selectedParcelCoords}
          parcelFieldsToUpdate={parcelFieldsToUpdate}
          setParcelFieldsToUpdate={setParcelFieldsToUpdate}
        ></ParcelInfo>
      ) : null}
      {interactionState == STATE.CLAIM_SELECTING ? (
        <ClaimInfo
          setInteractionState={setInteractionState}
          parcelClaimSize={parcelClaimSize}
        />
      ) : null}
      {interactionState == STATE.CLAIM_SELECTED &&
      perSecondFeeNumerator &&
      perSecondFeeDenominator ? (
        <>
          <ClaimAction
            {...props}
            licenseAddress={registryContract.address}
            isFairLaunch={isFairLaunch ?? undefined}
            perSecondFeeNumerator={perSecondFeeNumerator}
            perSecondFeeDenominator={perSecondFeeDenominator}
            requiredBid={requiredBid}
            setParcelFieldsToUpdate={setParcelFieldsToUpdate}
          ></ClaimAction>
        </>
      ) : null}
    </Col>
  );
}

export default Sidebar;
