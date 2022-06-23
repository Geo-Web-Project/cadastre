import * as React from "react";
import { BigNumber, ethers } from "ethers";
import { formatBalance } from "../../lib/formatBalance";
import { SidebarProps } from "../Sidebar";
import TransactionSummaryView from "./TransactionSummaryView";
import { fromValueToRate } from "../../lib/utils";
import { BasicProfileStreamManager } from "../../lib/stream-managers/BasicProfileStreamManager";
import {
  PAYMENT_TOKEN,
  NETWORK_ID,
  SECONDS_IN_YEAR,
} from "../../lib/constants";
import StreamingInfo from "./StreamingInfo";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import { truncateEth } from "../../lib/truncate";
import Col from "react-bootstrap/Col";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import WrapModal from "../wrap/WrapModal";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import advancedFormat from "dayjs/plugin/advancedFormat";
import AuctionInstructions from "../AuctionInstructions";

dayjs.extend(utc);
dayjs.extend(advancedFormat);

export type RejectBidActionProps = SidebarProps & {
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  parcelData: any;
  bidTimestamp: BigNumber | null;
  bidForSalePrice: BigNumber;
};

enum Action {
  CLAIM,
  BID,
}

function RejectBidAction(props: RejectBidActionProps) {
  const {
    parcelData,
    provider,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    selectedParcelId,
    paymentToken,
    account,
    auctionSuperApp,
    sfFramework,
    bidTimestamp,
    bidForSalePrice,
  } = props;

  const bidForSalePriceDisplay = truncateEth(
    formatBalance(bidForSalePrice),
    18
  );

  const [showWrapModal, setShowWrapModal] = React.useState(false);
  const [didFail, setDidFail] = React.useState(false);
  const [isActing, setIsActing] = React.useState(false);
  const [displayNewForSalePrice, setDisplayNewForSalePrice] =
    React.useState<string>(bidForSalePriceDisplay);

  const handleWrapModalOpen = () => setShowWrapModal(true);
  const handleWrapModalClose = () => setShowWrapModal(false);

  const spinner = (
    <span className="spinner-border" role="status">
      <span className="sr-only">Sending Transaction...</span>
    </span>
  );

  const displayCurrentForSalePrice = formatBalance(
    parcelData.landParcel.license.currentOwnerBid.forSalePrice
  );
  const currentForSalePrice = ethers.utils.parseEther(
    displayCurrentForSalePrice
  );

  const newForSalePrice =
    displayNewForSalePrice.length > 0 && !isNaN(Number(displayNewForSalePrice))
      ? ethers.utils.parseEther(displayNewForSalePrice)
      : null;

  const isForSalePriceInvalid: boolean =
    displayNewForSalePrice.length > 0 &&
    (isNaN(Number(displayNewForSalePrice)) ||
      ethers.utils.parseEther(displayNewForSalePrice).lt(bidForSalePrice));

  const existingNetworkFee = fromValueToRate(
    currentForSalePrice,
    perSecondFeeNumerator,
    perSecondFeeDenominator
  );

  const newNetworkFee =
    !isForSalePriceInvalid &&
    newForSalePrice &&
    perSecondFeeNumerator &&
    perSecondFeeDenominator
      ? fromValueToRate(
          newForSalePrice,
          perSecondFeeNumerator,
          perSecondFeeDenominator
        )
      : null;

  const annualNetworkFeeRate = newNetworkFee?.mul(SECONDS_IN_YEAR);

  const annualFeePercentage =
    (perSecondFeeNumerator.toNumber() * SECONDS_IN_YEAR * 100) /
    perSecondFeeDenominator.toNumber();

  const [bidPeriodLength, setBidPeriodLength] =
    React.useState<BigNumber | null>(null);

  const [penaltyRateNumerator, setPenaltyRateNumerator] =
    React.useState<BigNumber | null>(null);
  const [penaltyRateDenominator, setPenaltyRateDenominator] =
    React.useState<BigNumber | null>(null);

  const penaltyPayment =
    penaltyRateNumerator && penaltyRateDenominator
      ? bidForSalePrice.mul(penaltyRateNumerator).div(penaltyRateDenominator)
      : null;

  const isInvalid =
    isForSalePriceInvalid || !displayNewForSalePrice || !penaltyPayment;

  React.useEffect(() => {
    async function checkBidPeriod() {
      if (!auctionSuperApp) return;

      setBidPeriodLength(await auctionSuperApp.bidPeriodLengthInSeconds());
    }

    async function checkPenaltyRate() {
      if (!auctionSuperApp) return;

      setPenaltyRateNumerator(await auctionSuperApp.penaltyNumerator());
      setPenaltyRateDenominator(await auctionSuperApp.penaltyDenominator());
    }

    checkBidPeriod();
    checkPenaltyRate();
  }, [auctionSuperApp]);

  const bidDeadline =
    bidTimestamp && bidPeriodLength ? bidTimestamp.add(bidPeriodLength) : null;
  const formattedBidDeadline = bidDeadline
    ? dayjs(bidDeadline.toNumber() * 1000)
        .utc()
        .format("YYYY-MM-DD HH:mm")
    : null;

  async function rejectBid() {
    setIsActing(true);
    setDidFail(false);

    if (!newForSalePrice) {
      throw new Error("Could not find newForSalePrice");
    }

    if (!newNetworkFee) {
      throw new Error("Could not find newNetworkFee");
    }

    if (!penaltyPayment) {
      throw new Error("Could not find penaltyPayment");
    }

    const bidData = ethers.utils.defaultAbiCoder.encode(
      ["uint256"],
      [selectedParcelId]
    );

    const actionData = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "bytes"],
      [newForSalePrice, bidData]
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

    // Approve amount above purchase price
    const approveOp = paymentToken.approve({
      receiver: auctionSuperApp.address,
      amount: newForSalePrice.add(penaltyPayment).toString(),
    });

    const signer = provider.getSigner() as any;

    let op;
    if (BigNumber.from(existingFlow.flowRate).gt(0)) {
      op = sfFramework.cfaV1.updateFlow({
        flowRate: BigNumber.from(existingFlow.flowRate)
          .sub(existingNetworkFee)
          .add(newNetworkFee)
          .toString(),
        receiver: auctionSuperApp.address,
        superToken: paymentToken.address,
        userData,
      });
    } else {
      op = sfFramework.cfaV1.createFlow({
        receiver: auctionSuperApp.address,
        flowRate: newNetworkFee.toString(),
        superToken: paymentToken.address,
        userData,
      });
    }

    try {
      // Perform these in a single batch call
      const batchCall = sfFramework.batchCall([approveOp, op]);
      const txn = await batchCall.exec(signer);
      await txn.wait();
    } catch (err) {
      console.error(err);
      setDidFail(true);
    }

    setIsActing(false);
  }

  return (
    <>
      <Card border="secondary" className="bg-dark mt-5">
        <Card.Header>
          <h3>Reject Bid</h3>
        </Card.Header>
        <Card.Body>
          <p>
            For Sale Price (Bid): {bidForSalePriceDisplay} {PAYMENT_TOKEN}
          </p>
          <p>
            Response Deadline:{" "}
            {formattedBidDeadline ? formattedBidDeadline : spinner} UTC
          </p>
          <Form>
            <Form.Group>
              <Form.Text className="text-primary mb-1">
                New For Sale Price ({PAYMENT_TOKEN})
              </Form.Text>
              <Form.Control
                required
                isInvalid={isForSalePriceInvalid}
                className="bg-dark text-light"
                type="text"
                placeholder={`New For Sale Price (${PAYMENT_TOKEN})`}
                defaultValue={bidForSalePriceDisplay}
                aria-label="For Sale Price"
                aria-describedby="for-sale-price"
                disabled={isActing}
                onChange={(e) => setDisplayNewForSalePrice(e.target.value)}
              />
              {isForSalePriceInvalid ? (
                <Form.Control.Feedback type="invalid">
                  Must be equal or exceed the bid For Sale Price
                </Form.Control.Feedback>
              ) : null}

              <br />
              <Form.Text className="text-primary mb-1">
                {annualFeePercentage}% Network Fee ({PAYMENT_TOKEN}, Streamed)
              </Form.Text>
              <Form.Control
                className="bg-dark text-info"
                type="text"
                readOnly
                disabled
                value={`${
                  annualNetworkFeeRate
                    ? truncateEth(formatBalance(annualNetworkFeeRate), 10)
                    : "0"
                } ${PAYMENT_TOKEN}/year`}
                aria-label="Network Fee"
                aria-describedby="network-fee"
              />
            </Form.Group>
            <AuctionInstructions />
            <br />
            <hr className="action-form_divider" />
            <br />
            {!isForSalePriceInvalid && existingNetworkFee ? (
              <TransactionSummaryView
                existingNetworkFee={existingNetworkFee}
                newNetworkFee={newNetworkFee}
                currentForSalePrice={currentForSalePrice}
                penaltyPayment={penaltyPayment ?? undefined}
                {...props}
              />
            ) : null}

            <br />
            <span style={{ display: "flex", gap: "16px" }}>
              <Button
                variant="primary"
                className="w-100"
                onClick={handleWrapModalOpen}
              >
                {"Wrap to ETHx"}
              </Button>
              <Button
                variant="primary"
                className="w-100"
                onClick={() => rejectBid()}
                disabled={isActing || isInvalid}
              >
                {isActing ? spinner : "Submit"}
              </Button>
            </span>
          </Form>

          <br />
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
        </Card.Body>
        <Card.Footer className="border-top border-secondary">
          <Row>
            <Col sm="1">
              <Image src="notice.svg" />
            </Col>
            <Col className="font-italic">
              Claims, transfers, changes to For Sale Prices, and network fee
              payments require confirmation in your Web3 wallet.
            </Col>
          </Row>
        </Card.Footer>
      </Card>

      {showWrapModal && (
        <WrapModal
          account={account}
          provider={provider}
          show={showWrapModal}
          handleClose={handleWrapModalClose}
          paymentToken={paymentToken}
        />
      )}
      <StreamingInfo account={account} paymentToken={paymentToken} />
    </>
  );
}

export default RejectBidAction;
