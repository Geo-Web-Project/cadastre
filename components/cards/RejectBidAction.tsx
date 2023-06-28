import * as React from "react";
import { BigNumber, ethers } from "ethers";
import { formatBalance } from "../../lib/formatBalance";
import { ParcelFieldsToUpdate } from "../OffCanvasPanel";
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
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import WrapModal from "../wrap/WrapModal";
import SubmitBundleButton from "../SubmitBundleButton";
import AddFundsModal from "../profile/AddFundsModal";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import advancedFormat from "dayjs/plugin/advancedFormat";
import AuctionInstructions from "../AuctionInstructions";
import { STATE } from "../Map";
import InfoTooltip from "../InfoTooltip";
import TransactionError from "./TransactionError";
import type { IPCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/IPCOLicenseDiamond";
import ApproveButton from "../ApproveButton";
import PerformButton from "../PerformButton";
import { GeoWebParcel, ParcelInfoProps } from "./ParcelInfo";
import { useMediaQuery } from "../../lib/mediaQuery";
import { useBundleSettings } from "../../lib/transactionBundleSettings";

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
    account,
    smartAccount,
    setSmartAccount,
    setShouldRefetchParcelsData,
    parcelData,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    licenseDiamondContract,
    registryContract,
    bidTimestamp,
    bidForSalePrice,
    setInteractionState,
    setParcelFieldsToUpdate,
    sfFramework,
    paymentToken,
    signer,
  } = props;
  const { isMobile, isTablet } = useMediaQuery();
  const bundleSettings = useBundleSettings();

  const bidForSalePriceDisplay = truncateEth(
    formatBalance(bidForSalePrice),
    18
  );

  const [showWrapModal, setShowWrapModal] = React.useState(false);
  const [didFail, setDidFail] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [isActing, setIsActing] = React.useState(false);
  const [displayNewForSalePrice, setDisplayNewForSalePrice] =
    React.useState<string>(bidForSalePriceDisplay);
  const [isAllowed, setIsAllowed] = React.useState(false);
  const [transactionBundleFeesEstimate, setTransactionBundleFeesEstimate] =
    React.useState<BigNumber | null>(null);
  const [showAddFundsModal, setShowAddFundsModal] = React.useState(false);
  const [safeEthBalance, setSafeEthBalance] = React.useState<BigNumber | null>(
    null
  );
  const [bidPeriodLength, setBidPeriodLength] =
    React.useState<BigNumber | null>(null);

  const [penaltyRateNumerator, setPenaltyRateNumerator] =
    React.useState<BigNumber | null>(null);
  const [penaltyRateDenominator, setPenaltyRateDenominator] =
    React.useState<BigNumber | null>(null);
  const [oldRequiredBuffer, setOldRequiredBuffer] =
    React.useState<BigNumber | null>(null);
  const [newRequiredBuffer, setNewRequiredBuffer] =
    React.useState<BigNumber | null>(null);

  const { superTokenBalance } = useSuperTokenBalance(
    smartAccount?.safe ? smartAccount.address : account,
    paymentToken.address
  );

  const handleWrapModalOpen = () => setShowWrapModal(true);
  const handleWrapModalClose = () => setShowWrapModal(false);

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

  const penaltyPayment =
    penaltyRateNumerator && penaltyRateDenominator
      ? bidForSalePrice.mul(penaltyRateNumerator).div(penaltyRateDenominator)
      : null;

  const requiredPayment =
    penaltyPayment && newRequiredBuffer && oldRequiredBuffer
      ? penaltyPayment.add(newRequiredBuffer).sub(oldRequiredBuffer)
      : null;

  const isSignerBalanceInsufficient = requiredPayment
    ? requiredPayment?.gt(superTokenBalance)
    : false;

  const isInvalid =
    isForSalePriceInvalid || !displayNewForSalePrice || !penaltyPayment;

  const isSafeBalanceInsufficient =
    smartAccount?.safe &&
    bundleSettings.isSponsored &&
    requiredPayment &&
    safeEthBalance
      ? requiredPayment
          .add(transactionBundleFeesEstimate ?? 0)
          .gt(superTokenBalance.add(safeEthBalance))
      : false;

  const isSafeEthBalanceInsufficient =
    smartAccount?.safe &&
    !bundleSettings.isSponsored &&
    safeEthBalance &&
    transactionBundleFeesEstimate
      ? transactionBundleFeesEstimate.gt(safeEthBalance)
      : false;

  const isSafeSuperTokenBalanceInsufficient =
    smartAccount?.safe &&
    (!bundleSettings.isSponsored || bundleSettings.noWrap) &&
    requiredPayment
      ? requiredPayment.gt(superTokenBalance)
      : false;

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
    let timerId: NodeJS.Timer;

    if (smartAccount?.safe) {
      timerId = setInterval(async () => {
        if (smartAccount?.safe) {
          const safeEthBalance = await smartAccount.safe.getBalance();
          setSafeEthBalance(safeEthBalance);
        }
      }, 10000);
    }

    return () => clearInterval(timerId);
  }, [smartAccount]);

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

  const bidDeadline =
    bidTimestamp && bidPeriodLength ? bidTimestamp.add(bidPeriodLength) : null;
  const formattedBidDeadline = bidDeadline
    ? dayjs.unix(bidDeadline.toNumber()).format("YYYY-MM-DD HH:mm z")
    : null;

  function encodeRejectBidData() {
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

    if (!signer) {
      throw new Error("Could not find signer");
    }

    const encodedRejectBidData =
      licenseDiamondContract.interface.encodeFunctionData("rejectBid", [
        newNetworkFee,
        newForSalePrice,
      ]);

    return encodedRejectBidData;
  }

  async function rejectBid() {
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

    if (!signer) {
      throw new Error("Could not find signer");
    }

    try {
      const txn = await licenseDiamondContract
        .connect(signer)
        .rejectBid(newNetworkFee, newForSalePrice);
      await txn.wait();
    } catch (err) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      if (
        (err as any)?.code !== "TRANSACTION_REPLACED" ||
        (err as any).cancelled
      ) {
        console.error(err);
        setErrorMessage(
          (err as any).reason
            ? (err as any).reason.replace("execution reverted: ", "")
            : (err as Error).message
        );
        setDidFail(true);
        setIsActing(false);
        return;
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }

    setIsActing(false);
    setInteractionState(STATE.PARCEL_SELECTED);
    setShouldRefetchParcelsData(true);
    setParcelFieldsToUpdate({
      forSalePrice: displayNewForSalePrice !== displayCurrentForSalePrice,
      licenseOwner: false,
    });
  }

  async function bundleCallback() {
    setIsActing(false);
    setShouldRefetchParcelsData(true);
    setInteractionState(STATE.PARCEL_SELECTED);
    setParcelFieldsToUpdate({
      forSalePrice: displayNewForSalePrice !== displayCurrentForSalePrice,
      licenseOwner: false,
    });
  }

  return (
    <>
      <Card
        border={isMobile || isTablet ? "dark" : "secondary"}
        className="bg-dark"
      >
        <Card.Header className="d-none d-lg-block">
          <h3>Reject Bid</h3>
        </Card.Header>
        <Card.Body className="p-1 p-lg-3">
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
                  position={{ top: isMobile }}
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
                inputMode="numeric"
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
                    ? truncateEth(formatBalance(annualNetworkFeeRate), 8)
                    : "0"
                } ${PAYMENT_TOKEN}/year`}
                aria-label="Network Fee"
                aria-describedby="network-fee"
              />
            </Form.Group>
            <AuctionInstructions />
            <br className="d-lg-none" />
            <div className="d-none d-lg-block">
              <hr className="action-form_divider" />
            </div>
            {!isForSalePriceInvalid && existingAnnualNetworkFee ? (
              <TransactionSummaryView
                existingAnnualNetworkFee={existingAnnualNetworkFee}
                newAnnualNetworkFee={annualNetworkFeeRate ?? null}
                existingNetworkFee={existingNetworkFee}
                newNetworkFee={newNetworkFee}
                currentForSalePrice={currentForSalePrice}
                penaltyPayment={penaltyPayment ?? undefined}
                transactionBundleFeesEstimate={transactionBundleFeesEstimate}
                {...props}
              />
            ) : null}

            <br />
            {smartAccount?.safe ? (
              <>
                <Button
                  variant="secondary"
                  className="w-100 mb-3"
                  onClick={() => setShowAddFundsModal(true)}
                >
                  Add Funds
                </Button>
                <AddFundsModal
                  show={showAddFundsModal}
                  handleClose={() => setShowAddFundsModal(false)}
                  smartAccount={smartAccount}
                  setSmartAccount={setSmartAccount}
                  superTokenBalance={superTokenBalance}
                />
                <SubmitBundleButton
                  {...props}
                  superTokenBalance={superTokenBalance}
                  requiredFlowAmount={annualNetworkFeeRate ?? null}
                  requiredPayment={requiredPayment}
                  spender={licenseDiamondContract?.address ?? null}
                  flowOperator={licenseDiamondContract?.address ?? null}
                  requiredBuffer={
                    oldRequiredBuffer && newRequiredBuffer
                      ? newRequiredBuffer.sub(oldRequiredBuffer)
                      : BigNumber.from(0)
                  }
                  setErrorMessage={setErrorMessage}
                  setIsActing={setIsActing}
                  setDidFail={setDidFail}
                  isDisabled={
                    isActing ||
                    isInvalid ||
                    isSafeBalanceInsufficient ||
                    isSafeEthBalanceInsufficient ||
                    isSafeSuperTokenBalanceInsufficient
                  }
                  isActing={isActing}
                  buttonText={"Reject Bid"}
                  encodeFunctionData={encodeRejectBidData}
                  callback={bundleCallback}
                  transactionBundleFeesEstimate={transactionBundleFeesEstimate}
                  setTransactionBundleFeesEstimate={
                    setTransactionBundleFeesEstimate
                  }
                />
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  className="w-100 mb-3"
                  onClick={handleWrapModalOpen}
                >
                  {`Wrap ETH to ${PAYMENT_TOKEN}`}
                </Button>
                <ApproveButton
                  {...props}
                  isDisabled={isActing}
                  requiredFlowAmount={annualNetworkFeeRate ?? null}
                  requiredPayment={requiredPayment}
                  spender={licenseDiamondContract?.address ?? null}
                  requiredFlowPermissions={2}
                  flowOperator={licenseDiamondContract?.address ?? null}
                  setErrorMessage={setErrorMessage}
                  isActing={isActing}
                  setIsActing={setIsActing}
                  setDidFail={setDidFail}
                  isAllowed={isAllowed}
                  setIsAllowed={setIsAllowed}
                />
                <PerformButton
                  isDisabled={
                    isActing || isInvalid || isSignerBalanceInsufficient
                  }
                  isActing={isActing}
                  buttonText={"Reject Bid"}
                  performAction={rejectBid}
                  isAllowed={isAllowed}
                />
              </>
            )}
          </Form>

          <br />
          {!smartAccount?.safe &&
          isSignerBalanceInsufficient &&
          displayNewForSalePrice &&
          !isActing ? (
            <Alert key="warning" variant="warning">
              <Alert.Heading>Insufficient ETHx</Alert.Heading>
              Please wrap enough ETH to ETHx to complete this transaction with
              the button above.
            </Alert>
          ) : isSafeBalanceInsufficient &&
            displayNewForSalePrice &&
            !isActing ? (
            <Alert variant="danger">
              <Alert.Heading>Insufficient Funds</Alert.Heading>
              You must deposit more ETH to your account to complete your
              transaction. Click Add Funds above.
            </Alert>
          ) : smartAccount?.safe &&
            bundleSettings.isSponsored &&
            !bundleSettings.noWrap &&
            safeEthBalance &&
            BigNumber.from(bundleSettings.wrapAmount).gt(safeEthBalance) &&
            displayNewForSalePrice &&
            !isActing ? (
            <Alert variant="warning">
              <Alert.Heading>ETH balance warning</Alert.Heading>
              You don't have enough ETH to fully fund your ETHx wrapping
              strategy. We'll wrap your full balance, but consider depositing
              ETH or changing your transaction settings.
            </Alert>
          ) : isSafeEthBalanceInsufficient &&
            displayNewForSalePrice &&
            !isActing ? (
            <Alert variant="danger">
              <Alert.Heading>Insufficient ETH for Gas</Alert.Heading>
              You must deposit more ETH to your account or enable transaction
              sponsoring in Transaction Settings.
            </Alert>
          ) : isSafeSuperTokenBalanceInsufficient &&
            displayNewForSalePrice &&
            !isActing ? (
            <Alert variant="danger">
              <Alert.Heading>Insufficient ETHx</Alert.Heading>
              You must wrap or deposit ETHx to your account to complete your
              transaction. You can add funds and wrap your ETH to ETHx in your
              profile. Alternatively, enable auto-wrapping in Transaction
              Settings.
            </Alert>
          ) : bundleSettings.isSponsored &&
            ((bundleSettings.noWrap &&
              requiredPayment &&
              superTokenBalance.lt(
                requiredPayment.add(transactionBundleFeesEstimate ?? 0)
              )) ||
              (BigNumber.from(bundleSettings.wrapAmount).gt(0) &&
                superTokenBalance.lt(transactionBundleFeesEstimate ?? 0))) &&
            displayNewForSalePrice &&
            !isActing ? (
            <Alert variant="warning">
              <Alert.Heading>Gas Sponsoring Notice</Alert.Heading>
              You have transaction sponsoring enabled, but your current ETHx
              balance doesn't cover the Initial Transfer shown above. We'll use
              your ETH balance to directly pay for the Transaction Cost then
              proceed with your chosen auto-wrapping strategy.
            </Alert>
          ) : didFail && !isActing ? (
            <TransactionError
              message={errorMessage}
              onClick={() => setDidFail(false)}
            />
          ) : null}
        </Card.Body>
      </Card>

      {showWrapModal && (
        <WrapModal
          show={showWrapModal}
          handleClose={handleWrapModalClose}
          {...props}
        />
      )}
      <StreamingInfo {...props} />
    </>
  );
}

export default RejectBidAction;
