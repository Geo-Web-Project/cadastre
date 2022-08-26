import dayjs from "dayjs";
import { BigNumber } from "ethers";
import * as React from "react";
import { Card } from "react-bootstrap";
import { PAYMENT_TOKEN } from "../../lib/constants";
import { formatBalance } from "../../lib/formatBalance";
import { truncateEth } from "../../lib/truncate";
import { SidebarProps } from "../Sidebar";
import utc from "dayjs/plugin/utc";
import advancedFormat from "dayjs/plugin/advancedFormat";
import Button from "react-bootstrap/Button";
import { fromValueToRate } from "../../lib/utils";
import { STATE } from "../Map";
import TransactionError from "./TransactionError";
import type { PCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/PCOLicenseDiamond";

dayjs.extend(utc);
dayjs.extend(advancedFormat);

type OutstandingBidViewProps = SidebarProps & {
  newForSalePrice: BigNumber;
  existingForSalePrice: BigNumber;
  bidTimestamp: BigNumber | null;
  licensorIsOwner: boolean;
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  licenseDiamondContract: PCOLicenseDiamond | null;
};

function OutstandingBidView({
  newForSalePrice,
  existingForSalePrice,
  bidTimestamp,
  licensorIsOwner,
  registryContract,
  licenseDiamondContract,
  selectedParcelId,
  perSecondFeeNumerator,
  perSecondFeeDenominator,
  setInteractionState,
  setSelectedParcelId,
}: OutstandingBidViewProps) {
  const [isActing, setIsActing] = React.useState(false);
  const [didFail, setDidFail] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  const newForSalePriceDisplay = truncateEth(
    formatBalance(newForSalePrice),
    18
  );

  const existingNetworkFee = fromValueToRate(
    existingForSalePrice,
    perSecondFeeNumerator,
    perSecondFeeDenominator
  );

  const existingForSalePriceDisplay = truncateEth(
    formatBalance(existingForSalePrice),
    18
  );

  const [bidPeriodLength, setBidPeriodLength] =
    React.useState<BigNumber | null>(null);
  const [ownerBidContributionRate, setOwnerBidContributionRate] =
    React.useState<BigNumber | null>(null);

  const spinner = (
    <span className="spinner-border" role="status">
      <span className="visually-hidden">Loading...</span>
    </span>
  );

  React.useEffect(() => {
    async function checkBidPeriod() {
      if (!registryContract || !licenseDiamondContract) return;

      setBidPeriodLength(await registryContract.getBidPeriodLengthInSeconds());
      setOwnerBidContributionRate(
        await licenseDiamondContract.contributionRate()
      );
    }

    checkBidPeriod();
  }, [registryContract, licenseDiamondContract]);

  const bidDeadline =
    bidTimestamp && bidPeriodLength ? bidTimestamp.add(bidPeriodLength) : null;
  const formattedBidDeadline = bidDeadline
    ? dayjs(bidDeadline.toNumber() * 1000)
        .utc()
        .format("YYYY-MM-DD HH:mm")
    : null;

  const isPastDeadline =
    bidDeadline && new Date(Number(bidDeadline) * 1000) <= new Date();

  const shouldAllowTrigger =
    ownerBidContributionRate &&
    (ownerBidContributionRate.eq(0) || isPastDeadline);

  async function acceptBid() {
    setIsActing(true);
    setDidFail(false);

    if (!licenseDiamondContract) {
      throw new Error("Could not find licenseDiamondContract");
    }

    if (!newForSalePrice) {
      throw new Error("Could not find newForSalePrice");
    }

    if (!existingNetworkFee) {
      throw new Error("Could not find existingNetworkFee");
    }

    try {
      const txn = await licenseDiamondContract.acceptBid();
      await txn.wait();
    } catch (err) {
      console.error(err);
      setErrorMessage(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any).reason
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (err as any).reason.replace("execution reverted: ", "")
          : (err as Error).message
      );
      setDidFail(true);
      setIsActing(false);
      return;
    }

    setIsActing(false);
    setInteractionState(STATE.PARCEL_SELECTED);
  }

  async function triggerTransfer() {
    setIsActing(true);
    setDidFail(false);

    if (!licenseDiamondContract) {
      throw new Error("Could not find licenseDiamondContract");
    }

    try {
      const txn = await licenseDiamondContract.triggerTransfer();

      await txn.wait();
    } catch (err) {
      console.error(err);
      setErrorMessage(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any).errorObject.reason.replace("execution reverted: ", "")
      );
      setDidFail(true);
      setIsActing(false);
      return;
    }

    setIsActing(false);
    setInteractionState(STATE.PARCEL_SELECTED);

    setSelectedParcelId("");
    setSelectedParcelId(selectedParcelId);
  }

  return (
    <Card className="bg-purple bg-opacity-25 mt-5">
      <Card.Header>
        <h3>Outstanding Bid</h3>
      </Card.Header>
      <Card.Body>
        <p>
          For Sale Price (Bid): {newForSalePriceDisplay} {PAYMENT_TOKEN}
        </p>
        <p>
          {licensorIsOwner
            ? "Payment You'd Receive: "
            : "Payment to Licensor: "}{" "}
          {existingForSalePriceDisplay} {PAYMENT_TOKEN}
        </p>
        <p>
          Response Deadline:{" "}
          {formattedBidDeadline ? formattedBidDeadline : spinner} UTC
        </p>
        {licensorIsOwner && !shouldAllowTrigger ? (
          <>
            <Button
              variant="success"
              className="w-100 mb-2"
              disabled={isActing}
              onClick={() => acceptBid()}
            >
              {isActing ? spinner : "Accept Bid"}
            </Button>
            <Button
              variant="danger"
              className="w-100 mb-2"
              disabled={isActing}
              onClick={() => setInteractionState(STATE.PARCEL_REJECTING_BID)}
            >
              Reject Bid
            </Button>
          </>
        ) : null}
        {shouldAllowTrigger ? (
          <Button
            variant="primary"
            className="w-100 mb-2"
            disabled={isActing}
            onClick={() => triggerTransfer()}
          >
            {isActing ? spinner : "Trigger Transfer"}
          </Button>
        ) : null}
        {didFail && !isActing ? (
          <TransactionError
            message={errorMessage}
            onClick={() => setDidFail(false)}
          />
        ) : null}
      </Card.Body>
    </Card>
  );
}

export default OutstandingBidView;
