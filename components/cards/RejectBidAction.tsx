import * as React from "react";
import { BigNumber, ethers } from "ethers";
import { formatBalance } from "../../lib/formatBalance";
import { ParcelFieldsToUpdate } from "../Sidebar";
import TransactionSummaryView from "./TransactionSummaryView";
import { fromValueToRate, calculateBufferNeeded } from "../../lib/utils";
import { PAYMENT_TOKEN, SECONDS_IN_YEAR } from "../../lib/constants";
import StreamingInfo from "./StreamingInfo";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
import { truncateEth } from "../../lib/truncate";
import { useSuperTokenBalance } from "../../lib/superTokenBalance";
import Image from "react-bootstrap/Image";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import advancedFormat from "dayjs/plugin/advancedFormat";
import AuctionInstructions from "../AuctionInstructions";
import { STATE } from "../Map";
import InfoTooltip from "../InfoTooltip";
import TransactionError from "./TransactionError";
import type { IPCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/IPCOLicenseDiamond";
import PerformButton from "../PerformButton";
import { GeoWebParcel, ParcelInfoProps } from "./ParcelInfo";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);

export type RejectBidActionProps = ParcelInfoProps & {
  signer: ethers.Signer;
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  parcelData: GeoWebParcel;
  bidTimestamp: BigNumber | null;
  bidForSalePrice: BigNumber;
  licenseDiamondContract: IPCOLicenseDiamond | null;
  setParcelFieldsToUpdate: React.Dispatch<
    React.SetStateAction<ParcelFieldsToUpdate | null>
  >;
};

const infoIcon = (
  <Image
    style={{
      width: "1.1rem",
      marginLeft: "4px",
    }}
    src="info.svg"
  />
);

function RejectBidAction(props: RejectBidActionProps) {
  const {
    smartAccount,
    account,
    parcelData,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    licenseDiamondContract,
    registryContract,
    bidTimestamp,
    bidForSalePrice,
    setInteractionState,
    setShouldRefetchParcelsData,
    setParcelFieldsToUpdate,
    sfFramework,
    paymentToken,
  } = props;

  const bidForSalePriceDisplay = truncateEth(
    formatBalance(bidForSalePrice),
    18
  );

  const [didFail, setDidFail] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [isActing, setIsActing] = React.useState(false);
  const [displayNewForSalePrice, setDisplayNewForSalePrice] =
    React.useState<string>(bidForSalePriceDisplay);
  const [isBalanceInsufficient, setIsBalanceInsufficient] =
    React.useState(false);
  const [ethBalanceSubGasBuffer, setEthBalanceSubGasBuffer] =
    React.useState<BigNumber>(BigNumber.from(0));

  const { superTokenBalance } = useSuperTokenBalance(
    account,
    paymentToken.address
  );

  const spinner = (
    <Spinner as="span" size="sm" animation="border" role="status">
      <span className="visually-hidden">Sending Transaction...</span>
    </Spinner>
  );

  const displayCurrentForSalePrice = formatBalance(
    parcelData.currentBid.forSalePrice
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

  const existingAnnualNetworkFee = fromValueToRate(
    currentForSalePrice,
    perSecondFeeNumerator.mul(SECONDS_IN_YEAR),
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

  const annualFeePercentage =
    (perSecondFeeNumerator.toNumber() * SECONDS_IN_YEAR * 100) /
    perSecondFeeDenominator.toNumber();

  const annualNetworkFeeRate = newForSalePrice
    ?.mul(annualFeePercentage)
    .div(100);

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

  const [oldRequiredBuffer, setOldRequiredBuffer] =
    React.useState<BigNumber | null>(null);

  React.useEffect(() => {
    const run = async () => {
      if (!existingNetworkFee) {
        setOldRequiredBuffer(null);
        return;
      }

      const _bufferNeeded = await calculateBufferNeeded(
        sfFramework,
        paymentToken,
        existingNetworkFee
      );
      setOldRequiredBuffer(_bufferNeeded);
    };

    run();
  }, [sfFramework, paymentToken, displayCurrentForSalePrice]);

  const [newRequiredBuffer, setNewRequiredBuffer] =
    React.useState<BigNumber | null>(null);

  React.useEffect(() => {
    const run = async () => {
      if (!newNetworkFee) {
        setNewRequiredBuffer(null);
        return;
      }

      const _bufferNeeded = await calculateBufferNeeded(
        sfFramework,
        paymentToken,
        newNetworkFee
      );
      setNewRequiredBuffer(_bufferNeeded);
    };

    run();
  }, [sfFramework, paymentToken, displayNewForSalePrice]);

  React.useEffect(() => {
    async function checkBidPeriod() {
      if (!registryContract) return;

      setBidPeriodLength(await registryContract.getBidPeriodLengthInSeconds());
    }

    async function checkPenaltyRate() {
      if (!registryContract) return;

      setPenaltyRateNumerator(await registryContract.getPenaltyNumerator());
      setPenaltyRateDenominator(await registryContract.getPenaltyDenominator());
    }

    checkBidPeriod();
    checkPenaltyRate();
  }, [registryContract]);

  React.useEffect(() => {
    (async () => {
      const ethBalance = await smartAccount?.safe?.getBalance();
      const gasBuffer = ethers.utils.parseEther("0.002");

      setEthBalanceSubGasBuffer(
        ethBalance ? ethBalance.sub(gasBuffer) : BigNumber.from(0)
      );

      const requiredPayment =
        penaltyPayment && newRequiredBuffer && oldRequiredBuffer
          ? penaltyPayment.add(newRequiredBuffer).sub(oldRequiredBuffer)
          : null;

      // TODO: is the correct way to check for insufficient balance?
      setIsBalanceInsufficient(
        requiredPayment ? requiredPayment?.gt(superTokenBalance) : false
      );
    })();
  }, [superTokenBalance]);

  const bidDeadline =
    bidTimestamp && bidPeriodLength ? bidTimestamp.add(bidPeriodLength) : null;
  const formattedBidDeadline = bidDeadline
    ? dayjs.unix(bidDeadline.toNumber()).format("YYYY-MM-DD HH:mm z")
    : null;

  function rejectBid() {
    setIsActing(true);
    setDidFail(false);

    if (!licenseDiamondContract) {
      throw new Error("Could not find licenseDiamondContract");
    }

    if (!newForSalePrice) {
      throw new Error("Could not find newForSalePrice");
    }

    if (!newNetworkFee) {
      throw new Error("Could not find newNetworkFee");
    }

    if (!penaltyPayment) {
      throw new Error("Could not find penaltyPayment");
    }

    if (!smartAccount?.safeAddress) {
      throw new Error("Safe is uninitialized");
    }

    const rejectBidTxData = licenseDiamondContract.interface.encodeFunctionData(
      "rejectBid",
      [newNetworkFee, newForSalePrice]
    );

    return rejectBidTxData;
  }

  const callback = async () => {
    setIsActing(false);
    setShouldRefetchParcelsData(true);
    setInteractionState(STATE.PARCEL_SELECTED);
    setParcelFieldsToUpdate({
      forSalePrice: displayNewForSalePrice !== displayCurrentForSalePrice,
      licenseOwner: false,
    });
  };

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
            {formattedBidDeadline ? formattedBidDeadline : spinner}
          </p>
          <Form>
            <Form.Group>
              <Form.Text className="text-primary mb-1">
                New For Sale Price ({PAYMENT_TOKEN})
                <InfoTooltip
                  content={
                    <div style={{ textAlign: "left" }}>
                      You’re rejecting a bid that is higher than your previous
                      For Sale Price, so make sure to set this as accurately as
                      you can this time!
                      <br />
                      <br />
                      You'll have 7 days to accept or reject any new bid that
                      meets this price. You must pay another penalty equal to
                      10% of the bidder's new For Sale Price if you wish to
                      reject a subsequent bid.
                      <br />
                      <br />
                      <a
                        href="https://docs.geoweb.network/concepts/partial-common-ownership"
                        target="_blank"
                        rel="noopener"
                      >
                        You can read more about Partial Common Ownership in our
                        docs.
                      </a>
                    </div>
                  }
                  target={infoIcon}
                />
              </Form.Text>
              <Form.Control
                required
                isInvalid={isForSalePriceInvalid}
                className="bg-dark text-light mt-1"
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
                <InfoTooltip
                  content={
                    <div style={{ textAlign: "left" }}>
                      Network fees are proportional to your For Sale Price. They
                      discourage squatting & create a healthier market. They are
                      used to fund public goods—promoting positive-sum outcomes.
                      You have a say in how they're spent!
                      <br />
                      <br />
                      You pay these fees by opening a per-second stream. Your
                      total yearly payment will be slightly lower than the
                      displayed value due to rounding.
                    </div>
                  }
                  target={infoIcon}
                />
              </Form.Text>
              <Form.Control
                className="bg-dark text-info mt-1"
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
            {!isForSalePriceInvalid && existingAnnualNetworkFee ? (
              <TransactionSummaryView
                existingAnnualNetworkFee={existingAnnualNetworkFee}
                newAnnualNetworkFee={annualNetworkFeeRate ?? null}
                existingNetworkFee={existingNetworkFee}
                newNetworkFee={newNetworkFee}
                currentForSalePrice={currentForSalePrice}
                penaltyPayment={penaltyPayment ?? undefined}
                {...props}
              />
            ) : null}

            <br />
            <PerformButton
              {...props}
              ethBalanceSubGasBuffer={ethBalanceSubGasBuffer}
              requiredFlowAmount={annualNetworkFeeRate ?? null}
              requiredPayment={
                penaltyPayment && newRequiredBuffer && oldRequiredBuffer
                  ? penaltyPayment.add(newRequiredBuffer).sub(oldRequiredBuffer)
                  : null
              }
              spender={licenseDiamondContract?.address ?? null}
              requiredFlowPermissions={2}
              flowOperator={licenseDiamondContract?.address ?? null}
              setErrorMessage={setErrorMessage}
              setIsActing={setIsActing}
              setDidFail={setDidFail}
              isDisabled={isActing || isInvalid || isBalanceInsufficient}
              isActing={isActing}
              buttonText={"Reject Bid"}
              encodeFunctionData={rejectBid}
              callback={callback}
            />
          </Form>

          <br />
          {isBalanceInsufficient && displayNewForSalePrice ? (
            <Alert key="warning" variant="warning">
              <Alert.Heading>Insufficient ETHx</Alert.Heading>
              Please wrap enough ETH to ETHx to complete this transaction with
              the button above.
            </Alert>
          ) : didFail && !isActing ? (
            <TransactionError
              message={errorMessage}
              onClick={() => setDidFail(false)}
            />
          ) : null}
        </Card.Body>
      </Card>
      <StreamingInfo {...props} />
    </>
  );
}

export default RejectBidAction;
