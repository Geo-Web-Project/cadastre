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

dayjs.extend(utc);
dayjs.extend(advancedFormat);

type OutstandingBidViewProps = SidebarProps & {
  newForSalePrice: BigNumber;
  existingForSalePrice: BigNumber;
  bidTimestamp: BigNumber | null;
};

function OutstandingBidView({
  newForSalePrice,
  existingForSalePrice,
  bidTimestamp,
  auctionSuperApp,
}: OutstandingBidViewProps) {
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
  return (
    <Card className="bg-purple mt-2">
      <Card.Header>
        <h3>Outstanding Bid</h3>
      </Card.Header>
      <Card.Body>
        <p>
          For Sale Price (Bid): {newForSalePriceDisplay} {PAYMENT_TOKEN}
        </p>
        <p>
          Payment to Licensor: {existingForSalePriceDisplay} {PAYMENT_TOKEN}
        </p>
        <p>
          Response Deadline:{" "}
          {formattedBidDeadline ? formattedBidDeadline : spinner} UTC
        </p>
      </Card.Body>
    </Card>
  );
}

export default OutstandingBidView;
