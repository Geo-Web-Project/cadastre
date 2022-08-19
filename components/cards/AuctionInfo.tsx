import { useState, useMemo, useEffect } from "react";
import { BigNumber } from "ethers";
import dayjs from "dayjs";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { STATE } from "../Map";
import { PAYMENT_TOKEN, AUCTION_LENGTH } from "../../lib/constants";
import { formatBalance } from "../../lib/formatBalance";
import { truncateEth } from "../../lib/truncate";
import { calculateTimeString } from "../../lib/utils";

function _calculateAuctionValue(
  forSalePrice: BigNumber,
  auctionStart: BigNumber,
  auctionLength: number
) {
  const blockTimestamp = BigNumber.from(Math.floor(Date.now() / 1000));
  const length = BigNumber.from(auctionLength);
  if (blockTimestamp.gt(auctionStart.add(length))) {
    return BigNumber.from(0);
  }

  const timeElapsed = blockTimestamp.sub(auctionStart);
  const priceDecrease = forSalePrice.mul(timeElapsed).div(length);
  return forSalePrice.sub(priceDecrease);
}

export type AuctionInfoProps = {
  account: string;
  licenseOwner: string;
  forSalePrice: BigNumber;
  auctionStart: BigNumber;
  interactionState: STATE;
  setInteractionState: React.Dispatch<React.SetStateAction<STATE>>;
  requiredBid: BigNumber | null;
  setRequiredBid: React.Dispatch<React.SetStateAction<BigNumber | null>>;
};

function AuctionInfo(props: AuctionInfoProps) {
  const {
    account,
    licenseOwner,
    forSalePrice,
    auctionStart,
    interactionState,
    setInteractionState,
    requiredBid,
    setRequiredBid,
  } = props;

  const [auctionEnd, setAuctionEnd] = useState("");
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  const formattedRequiredBid = useMemo(() => {
    if (requiredBid) {
      return truncateEth(formatBalance(requiredBid), 8);
    }
    return null;
  }, [requiredBid]);

  useEffect(() => {
    let interval: NodeJS.Timer | null = null;

    if (forSalePrice && auctionStart) {
      const invalidationTime =
        (auctionStart.toNumber() + AUCTION_LENGTH) * 1000;
      setAuctionEnd(
        `${dayjs(invalidationTime).utc().format("MM/DD/YYYY HH:mm")} UTC`
      );

      interval = setInterval(() => {
        const remaining = invalidationTime - Date.now();
        setTimeRemaining(calculateTimeString(remaining));

        setRequiredBid(
          _calculateAuctionValue(forSalePrice, auctionStart, AUCTION_LENGTH)
        );
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [forSalePrice, auctionStart]);

  const isLoading =
    forSalePrice == null || auctionStart == null || timeRemaining == null;
  const spinner = (
    <span className="spinner-border" role="status">
      <span className="visually-hidden">Loading...</span>
    </span>
  );

  const reclaimButton = (
    <Button
      variant="primary"
      className="w-100"
      onClick={() => {
        setInteractionState(STATE.PARCEL_RECLAIMING);
      }}
    >
      {account.toLowerCase() == licenseOwner?.toLowerCase()
        ? "Reclaim"
        : "Claim"}
    </Button>
  );

  return (
    <>
      <Card className="bg-purple bg-opacity-25">
        <Card.Header>
          <h4>
            {interactionState == STATE.PARCEL_RECLAIMING
              ? "Dutch Auction Details"
              : "Foreclosure Dutch Auction"}
          </h4>
        </Card.Header>
        <Card.Body className="pb-4">
          <p className="text-truncate">
            <span className="font-weight-bold">Current Required Bid: </span>
            {isLoading ? spinner : `${formattedRequiredBid} ${PAYMENT_TOKEN}`}
          </p>
          <p className="text-truncate">
            <span className="font-weight-bold">Auction End:</span>{" "}
            {isLoading ? spinner : auctionEnd}
          </p>
          <p className="text-truncate">
            <span className="font-weight-bold">Time Remaining:</span>{" "}
            {isLoading ? spinner : timeRemaining}
          </p>
          {interactionState == STATE.PARCEL_RECLAIMING ? null : reclaimButton}
        </Card.Body>
      </Card>
    </>
  );
}

export default AuctionInfo;
