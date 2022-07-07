import dayjs from "dayjs";
import { BigNumber, ethers } from "ethers";
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
import Alert from "react-bootstrap/Alert";
import { STATE } from "../Map";

dayjs.extend(utc);
dayjs.extend(advancedFormat);

enum Action {
  CLAIM,
  BID,
}

type TriggerTransferViewProps = SidebarProps & {
  newForSalePrice: BigNumber;
  existingForSalePrice: BigNumber;
  bidTimestamp: BigNumber | null;
  licensorIsOwner: boolean;
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
};

function TriggerTransferView({
  newForSalePrice,
  existingForSalePrice,
  bidTimestamp,
  auctionSuperApp,
  licensorIsOwner,
  provider,
  selectedParcelId,
  setSelectedParcelId,
  setInteractionState,
}: TriggerTransferViewProps) {
  const [isActing, setIsActing] = React.useState(false);
  const [didFail, setDidFail] = React.useState(false);

  const newForSalePriceDisplay = truncateEth(
    formatBalance(newForSalePrice),
    18
  );

  const existingForSalePriceDisplay = truncateEth(
    formatBalance(existingForSalePrice),
    18
  );

  const [bidPeriodLength, setBidPeriodLength] =
    React.useState<BigNumber | null>(null);

  const spinner = (
    <span className="spinner-border" role="status">
      <span className="sr-only">Loading...</span>
    </span>
  );

  React.useEffect(() => {
    async function checkBidPeriod() {
      if (!auctionSuperApp) return;

      setBidPeriodLength(await auctionSuperApp.bidPeriodLengthInSeconds());
    }

    checkBidPeriod();
  }, [auctionSuperApp]);

  const bidDeadline =
    bidTimestamp && bidPeriodLength ? bidTimestamp.add(bidPeriodLength) : null;
  const formattedBidDeadline = bidDeadline
    ? dayjs(bidDeadline.toNumber() * 1000)
        .utc()
        .format("YYYY-MM-DD HH:mm")
    : null;

  async function triggerTransfer() {
    setIsActing(true);
    setDidFail(false);

    const signer = provider.getSigner() as any;

    try {
      const txn = await auctionSuperApp
        .connect(signer)
        .claimOutstandingBid(selectedParcelId);
      await txn.wait();
    } catch (err) {
      console.error(err);
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
    <Card className="bg-purple mt-5">
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
        <Button
          variant="primary"
          className="w-100 mb-2"
          disabled={isActing}
          onClick={() => triggerTransfer()}
        >
          {isActing ? spinner : "Trigger Transfer"}
        </Button>
        {didFail && !isActing ? (
          <Alert variant="danger" dismissible onClick={() => setDidFail(false)}>
            <Alert.Heading style={{ fontSize: "1em" }}>
              Transaction failed
            </Alert.Heading>
            <p style={{ fontSize: "0.8em" }}>
              Oops! Something went wrong. Please try again.
            </p>
          </Alert>
        ) : null}
      </Card.Body>
    </Card>
  );
}

export default TriggerTransferView;
