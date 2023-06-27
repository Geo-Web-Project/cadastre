import * as React from "react";
import { BigNumber } from "ethers";
import { formatBalance } from "../../lib/formatBalance";
import { ParcelFieldsToUpdate } from "../OffCanvasPanel";
import TransactionSummaryView from "./TransactionSummaryView";
import { fromValueToRate } from "../../lib/utils";
import { PAYMENT_TOKEN, SECONDS_IN_YEAR } from "../../lib/constants";
import StreamingInfo from "./StreamingInfo";
import Card from "react-bootstrap/Card";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
import { useSuperTokenBalance } from "../../lib/superTokenBalance";
import Button from "react-bootstrap/Button";
import SubmitBundleButton from "../SubmitBundleButton";
import AddFundsModal from "../profile/AddFundsModal";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import advancedFormat from "dayjs/plugin/advancedFormat";
import AuctionInstructions from "../AuctionInstructions";
import { STATE } from "../Map";
import TransactionError from "./TransactionError";
import type { IPCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/IPCOLicenseDiamond";
import { ParcelInfoProps } from "./ParcelInfo";
import { useMediaQuery } from "../../lib/mediaQuery";
import { useBundleSettings } from "../../lib/transactionBundleSettings";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);

export type AcceptBidActionProps = ParcelInfoProps & {
  newForSalePrice: BigNumber;
  existingForSalePrice: BigNumber;
  bidTimestamp: BigNumber | null;
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  licenseDiamondContract: IPCOLicenseDiamond | null;
  setParcelFieldsToUpdate: React.Dispatch<
    React.SetStateAction<ParcelFieldsToUpdate | null>
  >;
};

function AcceptBidAction(props: AcceptBidActionProps) {
  const {
    newForSalePrice,
    existingForSalePrice,
    bidTimestamp,
    registryContract,
    smartAccount,
    setSmartAccount,
    licenseDiamondContract,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    setInteractionState,
    setParcelFieldsToUpdate,
    paymentToken,
    signer,
  } = props;
  const { isMobile, isTablet } = useMediaQuery();

  const [didFail, setDidFail] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [isActing, setIsActing] = React.useState(false);
  const [transactionBundleFeesEstimate, setTransactionBundleFeesEstimate] =
    React.useState<BigNumber | null>(null);
  const [showAddFundsModal, setShowAddFundsModal] = React.useState(false);
  const [safeEthBalance, setSafeEthBalance] = React.useState<BigNumber | null>(
    null
  );
  const [bidPeriodLength, setBidPeriodLength] =
    React.useState<BigNumber | null>(null);

  const { superTokenBalance } = useSuperTokenBalance(
    smartAccount?.safe ? smartAccount.address : "",
    paymentToken.address
  );
  const bundleSettings = useBundleSettings();

  const existingForSalePriceDisplay = formatBalance(existingForSalePrice);
  const newForSalePriceDisplay = formatBalance(newForSalePrice);
  const existingNetworkFee = fromValueToRate(
    existingForSalePrice,
    perSecondFeeNumerator,
    perSecondFeeDenominator
  );

  const existingAnnualNetworkFee = fromValueToRate(
    existingForSalePrice,
    perSecondFeeNumerator.mul(SECONDS_IN_YEAR),
    perSecondFeeDenominator
  );

  const newNetworkFee =
    newForSalePrice && perSecondFeeNumerator && perSecondFeeDenominator
      ? fromValueToRate(
          newForSalePrice,
          perSecondFeeNumerator,
          perSecondFeeDenominator
        )
      : null;

  const isSafeBalanceInsufficient =
    smartAccount?.safe &&
    bundleSettings.isSponsored &&
    safeEthBalance &&
    transactionBundleFeesEstimate
      ? transactionBundleFeesEstimate.gt(superTokenBalance.add(safeEthBalance))
      : false;

  const isSafeEthBalanceInsufficient =
    smartAccount?.safe &&
    !bundleSettings.isSponsored &&
    safeEthBalance &&
    transactionBundleFeesEstimate
      ? transactionBundleFeesEstimate.gt(safeEthBalance)
      : false;

  const spinner = (
    <Spinner as="span" size="sm" animation="border" role="status">
      <span className="visually-hidden">Sending Transaction...</span>
    </Spinner>
  );

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

    checkBidPeriod();
  }, [registryContract]);

  const bidDeadline =
    bidTimestamp && bidPeriodLength ? bidTimestamp.add(bidPeriodLength) : null;
  const formattedBidDeadline = bidDeadline
    ? dayjs.unix(bidDeadline.toNumber()).format("YYYY-MM-DD HH:mm z")
    : null;

  function encodeAcceptBidData() {
    if (!licenseDiamondContract) {
      throw new Error("Could not find licenseDiamondContract");
    }

    if (!newForSalePrice) {
      throw new Error("Could not find newForSalePrice");
    }

    if (!existingNetworkFee) {
      throw new Error("Could not find existingNetworkFee");
    }

    if (!signer) {
      throw new Error("Could not find signer");
    }
    const acceptBidData =
      licenseDiamondContract.interface.encodeFunctionData("acceptBid");

    return acceptBidData;
  }

  async function bundleCallback() {
    setIsActing(false);
    setParcelFieldsToUpdate({
      forSalePrice: newForSalePriceDisplay !== existingForSalePriceDisplay,
      licenseOwner: true,
    });
    setInteractionState(STATE.PARCEL_SELECTED);
  }

  return (
    <>
      <Card
        border={isMobile || isTablet ? "dark" : "secondary"}
        className="bg-dark"
      >
        <Card.Header className="d-none d-lg-block">
          <h3>Accept Bid</h3>
        </Card.Header>
        <Card.Body className="p-1 p-lg-3">
          <p>
            For Sale Price (Bid): {newForSalePriceDisplay} {PAYMENT_TOKEN}
          </p>
          <p>
            Response Deadline:{" "}
            {formattedBidDeadline ? formattedBidDeadline : spinner}
          </p>
          <AuctionInstructions />
          <br className="d-lg-none" />
          <div className="d-none d-lg-block">
            <hr className="action-form_divider" />
          </div>
          {existingAnnualNetworkFee ? (
            <TransactionSummaryView
              existingAnnualNetworkFee={existingAnnualNetworkFee}
              newAnnualNetworkFee={BigNumber.from(0)}
              existingNetworkFee={existingNetworkFee}
              newNetworkFee={newNetworkFee}
              currentForSalePrice={existingForSalePrice}
              transactionBundleFeesEstimate={transactionBundleFeesEstimate}
              {...props}
            />
          ) : null}

          <br />
          {smartAccount && (
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
                forSalePrice={existingForSalePrice}
                requiredFlowAmount={BigNumber.from(0)}
                requiredPayment={BigNumber.from(0)}
                spender={licenseDiamondContract?.address ?? null}
                flowOperator={licenseDiamondContract?.address ?? null}
                setErrorMessage={setErrorMessage}
                setIsActing={setIsActing}
                setDidFail={setDidFail}
                isDisabled={
                  isActing ||
                  isSafeBalanceInsufficient ||
                  isSafeEthBalanceInsufficient
                }
                isActing={isActing}
                buttonText={"Accept Bid"}
                encodeFunctionData={encodeAcceptBidData}
                callback={bundleCallback}
                transactionBundleFeesEstimate={transactionBundleFeesEstimate}
                setTransactionBundleFeesEstimate={
                  setTransactionBundleFeesEstimate
                }
              />
            </>
          )}
          <br />
          <br />
          {isSafeBalanceInsufficient && newForSalePriceDisplay && !isActing ? (
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
            newForSalePriceDisplay &&
            !isActing ? (
            <Alert variant="warning">
              <Alert.Heading>ETH balance warning</Alert.Heading>
              You don't have enough ETH to fully fund your ETHx wrapping
              strategy. We'll wrap your full balance, but consider depositing
              ETH or changing your transaction settings.
            </Alert>
          ) : isSafeEthBalanceInsufficient &&
            newForSalePriceDisplay &&
            !isActing ? (
            <Alert variant="danger">
              <Alert.Heading>Insufficient ETH for Gas</Alert.Heading>
              You must deposit more ETH to your account or enable transaction
              sponsoring in Transaction Settings.
            </Alert>
          ) : bundleSettings.isSponsored &&
            ((bundleSettings.noWrap &&
              superTokenBalance.lt(transactionBundleFeesEstimate ?? 0)) ||
              (BigNumber.from(bundleSettings.wrapAmount).gt(0) &&
                superTokenBalance.lt(transactionBundleFeesEstimate ?? 0))) &&
            newForSalePriceDisplay &&
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
      {signer && <StreamingInfo {...props} signer={signer} />}
    </>
  );
}

export default AcceptBidAction;
