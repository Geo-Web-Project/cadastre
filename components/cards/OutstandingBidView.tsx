import dayjs from "dayjs";
import { BigNumber, ethers } from "ethers";
import * as React from "react";
import { Card } from "react-bootstrap";
import { PAYMENT_TOKEN, NETWORK_ID } from "../../lib/constants";
import { formatBalance } from "../../lib/formatBalance";
import { truncateEth } from "../../lib/truncate";
import { SidebarProps } from "../Sidebar";
import utc from "dayjs/plugin/utc";
import advancedFormat from "dayjs/plugin/advancedFormat";
import Button from "react-bootstrap/Button";
import { fromValueToRate } from "../../lib/utils";
import Alert from "react-bootstrap/Alert";

dayjs.extend(utc);
dayjs.extend(advancedFormat);

enum Action {
  CLAIM,
  BID,
}

type OutstandingBidViewProps = SidebarProps & {
  newForSalePrice: BigNumber;
  existingForSalePrice: BigNumber;
  bidTimestamp: BigNumber | null;
  licensorIsOwner: boolean;
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
};

function OutstandingBidView({
  newForSalePrice,
  existingForSalePrice,
  bidTimestamp,
  auctionSuperApp,
  licensorIsOwner,
  provider,
  selectedParcelId,
  paymentToken,
  account,
  perSecondFeeNumerator,
  perSecondFeeDenominator,
  sfFramework,
}: OutstandingBidViewProps) {
  const [isActing, setIsActing] = React.useState(false);
  const [didFail, setDidFail] = React.useState(false);

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

  async function acceptBid() {
    setIsActing(true);

    if (!newForSalePrice) {
      throw new Error("Could not find newForSalePrice");
    }

    if (!existingNetworkFee) {
      throw new Error("Could not find existingNetworkFee");
    }

    const bidData = ethers.utils.defaultAbiCoder.encode(
      ["uint256"],
      [selectedParcelId]
    );

    const actionData = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "bytes"],
      [BigNumber.from(0), bidData]
    );

    const userData = ethers.utils.defaultAbiCoder.encode(
      ["uint8", "bytes"],
      [Action.BID, actionData]
    );

    const existingFlow = await sfFramework.cfaV1.getFlow({
      superToken: paymentToken.address,
      sender: account,
      receiver: auctionSuperApp.address,
      providerOrSigner: provider as any,
    });

    const signer = provider.getSigner() as any;

    let op;
    if (BigNumber.from(existingFlow.flowRate).eq(existingNetworkFee)) {
      op = sfFramework.cfaV1.deleteFlow({
        sender: account,
        receiver: auctionSuperApp.address,
        superToken: paymentToken.address,
      });
    } else {
      op = sfFramework.cfaV1.updateFlow({
        flowRate: BigNumber.from(existingFlow.flowRate)
          .sub(existingNetworkFee)
          .toString(),
        receiver: auctionSuperApp.address,
        superToken: paymentToken.address,
        userData,
      });
    }

    try {
      const txn = await op.exec(signer);
      await txn.wait();
    } catch (err) {
      console.error(err);
      setDidFail(true);
    }

    setIsActing(false);
  }

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
          {licensorIsOwner
            ? "Payment You'd Receive: "
            : "Payment to Licensor: "}{" "}
          {existingForSalePriceDisplay} {PAYMENT_TOKEN}
        </p>
        <p>
          Response Deadline:{" "}
          {formattedBidDeadline ? formattedBidDeadline : spinner} UTC
        </p>
        {licensorIsOwner ? (
          <>
            <Button
              variant="success"
              className="w-100 mb-2"
              disabled={isActing}
              onClick={() => acceptBid()}
            >
              {isActing ? spinner : "Accept Bid"}
            </Button>
            <Button variant="danger" className="w-100 mb-2" disabled={isActing}>
              Reject Bid
            </Button>
            {didFail && !isActing ? (
              <Alert
                variant="danger"
                dismissible
                onClick={() => setDidFail(false)}
              >
                <Alert.Heading style={{ fontSize: "1em" }}>
                  Transaction failed
                </Alert.Heading>
                <p style={{ fontSize: "0.8em" }}>
                  Oops! Something went wrong. Please try again.
                </p>
              </Alert>
            ) : null}
          </>
        ) : null}
      </Card.Body>
    </Card>
  );
}

export default OutstandingBidView;
