import { useState, useMemo, useEffect } from "react";
import { BigNumber } from "ethers";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import advancedFormat from "dayjs/plugin/advancedFormat";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { STATE } from "../Map";
import { PAYMENT_TOKEN } from "../../lib/constants";
import { formatBalance } from "../../lib/formatBalance";
import { truncateEth } from "../../lib/truncate";
import { calculateTimeString, calculateAuctionValue } from "../../lib/utils";
import { ParcelInfoProps } from "./ParcelInfo";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);

export type AuctionInfoProps = ParcelInfoProps & {
  account: string;
  licenseOwner: string;
  forSalePrice: BigNumber;
  auctionStart: Date;
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
    registryContract,
  } = props;

  const [auctionEnd, setAuctionEnd] = useState("");
  const [auctionLength, setAuctionLength] = useState<BigNumber | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  const formattedRequiredBid = useMemo(() => {
    if (requiredBid) {
      return truncateEth(formatBalance(requiredBid), 8);
    }
    return null;
  }, [requiredBid]);

  useEffect(() => {
    async function run() {
      if (!registryContract) {
        setAuctionLength(null);
        return;
      }

      const _auctionLength = await registryContract.getReclaimAuctionLength();
      setAuctionLength(_auctionLength);
    }

    run();
  }, [registryContract]);

  useEffect(() => {
    let interval: NodeJS.Timer | null = null;

    async function run() {
      if (forSalePrice && auctionStart && auctionLength) {
        const invalidationTime = BigNumber.from(auctionStart.getTime())
          .div(1000)
          .add(auctionLength)
          .mul(1000)
          .toNumber();
        setAuctionEnd(
          `${dayjs.unix(invalidationTime / 1000).format("MM-DD-YYYY HH:mm z")}`
        );

        interval = setInterval(() => {
          const remaining = invalidationTime - Date.now();
          setTimeRemaining(calculateTimeString(remaining));

          setRequiredBid(
            calculateAuctionValue(
              forSalePrice,
              BigNumber.from(auctionStart.getTime()).div(1000),
              auctionLength
            )
          );
        }, 1000);
      }
    }

    run();

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [forSalePrice, auctionStart, auctionLength]);

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
