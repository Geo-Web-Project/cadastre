import * as React from "react";
import { BigNumber, ethers } from "ethers";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import { OffCanvasPanelProps } from "../OffCanvasPanel";
import InfoTooltip from "../InfoTooltip";
import TransactionBundleConfigModal, {
  TransactionBundleConfig,
} from "../TransactionBundleConfigModal";
import { STATE } from "../Map";
import { PAYMENT_TOKEN } from "../../lib/constants";
import { formatBalance } from "../../lib/formatBalance";
import { truncateEth } from "../../lib/truncate";
import { calculateBufferNeeded } from "../../lib/utils";
import { useMediaQuery } from "../../lib/mediaQuery";

type TransactionSummaryViewProps = OffCanvasPanelProps & {
  existingNetworkFee?: BigNumber;
  newNetworkFee: BigNumber | null;
  existingAnnualNetworkFee?: BigNumber;
  newAnnualNetworkFee: BigNumber | null;
  claimPayment?: BigNumber;
  collateralDeposit?: BigNumber;
  penaltyPayment?: BigNumber;
  currentForSalePrice?: BigNumber;
  licenseOwner?: string;
  transactionBundleFeesEstimate: BigNumber | null;
  transactionBundleConfig: TransactionBundleConfig;
  setTransactionBundleConfig: React.Dispatch<
    React.SetStateAction<TransactionBundleConfig>
  >;
};

function TransactionSummaryView({
  existingAnnualNetworkFee = BigNumber.from(0),
  newAnnualNetworkFee,
  existingNetworkFee = BigNumber.from(0),
  newNetworkFee,
  smartAccount,
  account,
  interactionState,
  licenseOwner,
  claimPayment,
  collateralDeposit,
  currentForSalePrice,
  penaltyPayment,
  sfFramework,
  paymentToken,
  transactionBundleFeesEstimate,
  transactionBundleConfig,
  setTransactionBundleConfig,
}: TransactionSummaryViewProps) {
  const { isMobile } = useMediaQuery();

  const txnReady = newAnnualNetworkFee != null;

  const isDeltaPayment = !collateralDeposit && !claimPayment;

  const networkFeeDelta = newAnnualNetworkFee
    ? newAnnualNetworkFee.sub(existingAnnualNetworkFee)
    : BigNumber.from(0);

  const stream =
    !isDeltaPayment && newAnnualNetworkFee
      ? newAnnualNetworkFee
      : networkFeeDelta ?? BigNumber.from(0);

  const streamDisplay = truncateEth(formatBalance(stream), 18);
  const transactionBundleFeesDisplay = transactionBundleFeesEstimate
    ? truncateEth(formatBalance(transactionBundleFeesEstimate), 8)
    : null;

  const [streamBuffer, setStreamBuffer] = React.useState<BigNumber | null>(
    null
  );
  const [lastStream, setLastStream] = React.useState<BigNumber | null>(null);
  const [
    showTransactionBundleConfigModal,
    setShowTransactionBundleConfigModal,
  ] = React.useState<boolean>(false);

  React.useEffect(() => {
    const run = async () => {
      if (!stream || stream.div(365 * 24 * 60 * 60).eq(0)) {
        setStreamBuffer(BigNumber.from(0));
        return;
      }

      if ((!lastStream || !stream.eq(lastStream)) && newNetworkFee) {
        const existingBuffer = await calculateBufferNeeded(
          sfFramework,
          paymentToken,
          existingNetworkFee
        );
        const newBuffer = await calculateBufferNeeded(
          sfFramework,
          paymentToken,
          newNetworkFee
        );
        // Multiply by 2x for user buffer and PCOLicenseDiamond buffer
        setStreamBuffer(newBuffer.sub(existingBuffer).mul(2));
        setLastStream(stream);
      }
    };

    run();
  }, [sfFramework, paymentToken, newNetworkFee]);

  const streamBufferDisplay = streamBuffer
    ? truncateEth(formatBalance(streamBuffer), 8)
    : "";

  let paymentView;

  if (claimPayment) {
    paymentView = (
      <p>
        {interactionState == STATE.PARCEL_RECLAIMING &&
        account.toLowerCase() != licenseOwner?.toLowerCase()
          ? "Max Claim Payment (to Licensor): "
          : "Claim Payment: "}
        <InfoTooltip
          position={{ top: isMobile }}
          content={
            <div style={{ textAlign: "left" }}>
              {interactionState == STATE.PARCEL_RECLAIMING &&
              account.toLowerCase() === licenseOwner?.toLowerCase()
                ? "No one-time payment is required to reclaim your foreclosed parcel—just restart a network fee stream."
                : `Parcel claims require a flat, one-time payment of ${truncateEth(
                    ethers.utils.formatEther(claimPayment),
                    8
                  )} ${PAYMENT_TOKEN}. This is enforced to prevent low-value claims and squatting.`}
            </div>
          }
          target={
            <span style={{ textDecoration: "underline" }}>
              {truncateEth(ethers.utils.formatEther(claimPayment), 8)}{" "}
              {PAYMENT_TOKEN}
            </span>
          }
        />
      </p>
    );
  } else if (collateralDeposit && currentForSalePrice) {
    const displayCollateralDeposit = formatBalance(collateralDeposit);
    const displayCurrentForSalePrice = formatBalance(currentForSalePrice);
    const displayRefundableCollateral = formatBalance(
      collateralDeposit.sub(currentForSalePrice)
    );
    paymentView = (
      <>
        <p>
          Collateral Deposit:{" "}
          <InfoTooltip
            content={
              <div style={{ textAlign: "left" }}>
                Bids must be fully collateralized. If your bid is rejected, this
                full amount will be returned.
              </div>
            }
            target={
              <span style={{ textDecoration: "underline" }}>
                {displayCollateralDeposit} {PAYMENT_TOKEN}
              </span>
            }
          />
        </p>
        <p>
          &emsp;&ensp;Purchase Payment:{" "}
          <InfoTooltip
            content={
              <div style={{ textAlign: "left" }}>
                This is the amount that will be transferred to the current
                licensor if they accept your bid.
              </div>
            }
            target={
              <span style={{ textDecoration: "underline" }}>
                {displayCurrentForSalePrice} {PAYMENT_TOKEN}
              </span>
            }
          />
        </p>
        <p>
          &emsp;&ensp;Refundable Collateral:{" "}
          <InfoTooltip
            content={
              <div style={{ textAlign: "left" }}>
                This is the amount that will be returned to you if your bid is
                accepted.
              </div>
            }
            target={
              <span style={{ textDecoration: "underline" }}>
                {displayRefundableCollateral} {PAYMENT_TOKEN}
              </span>
            }
          />
        </p>
      </>
    );
  } else if (penaltyPayment) {
    const displayPenaltyPayment = formatBalance(penaltyPayment);
    paymentView = (
      <p>
        Penalty Payment:{" "}
        <InfoTooltip
          content={
            <div style={{ textAlign: "left" }}>
              This is the amount you must pay to the Geo Web treasury to reject
              the incoming bid (10% of the bidder’s For Sale Price). This
              penalty is enforced to discourage underpricing of your parcel(s).
            </div>
          }
          target={
            <span style={{ textDecoration: "underline" }}>
              {displayPenaltyPayment} {PAYMENT_TOKEN}
            </span>
          }
        />
      </p>
    );
  }

  const streamView = (
    <p
      className={
        interactionState === STATE.PARCEL_EDITING &&
        !transactionBundleConfig.isSponsored
          ? "mb-2"
          : ""
      }
    >
      Stream:{" "}
      <InfoTooltip
        content={
          <div style={{ textAlign: "left" }}>
            {collateralDeposit
              ? "This is the amount you authorize your network fee stream to be increased if your bid is accepted."
              : "Once opened, your pro rata Network Fee stream is deducted from your ETHx token balance every second. The value shown here will be added (or subtracted) to your current Network Fee stream."}
          </div>
        }
        target={
          <span style={{ textDecoration: "underline" }}>
            {txnReady
              ? `${
                  stream.gt(0) ? "+" : ""
                }${streamDisplay} ${PAYMENT_TOKEN}/year`
              : `N/A`}
          </span>
        }
      />
    </p>
  );

  const streamBufferView = (
    <p className="mb-2">
      Stream Buffer:{" "}
      <InfoTooltip
        content={
          <div style={{ textAlign: "left" }}>
            This is the required adjustment to your stream buffer deposit. Half
            of this adjustment will take the form of an ERC20 transfer between
            your wallet and the parcel smart contract. The other half will be
            automatically subtracted/added to your wallet's available{" "}
            {PAYMENT_TOKEN} balance.
            <br />
            <br />
            Stream buffers are used to incentivize closing your stream(s) if
            your {PAYMENT_TOKEN} balance reaches 0.
          </div>
        }
        target={
          <span style={{ textDecoration: "underline" }}>
            {txnReady
              ? `${
                  streamBuffer?.gt(0) ? "+" : ""
                }${streamBufferDisplay} ${PAYMENT_TOKEN}`
              : `N/A`}
          </span>
        }
      />
    </p>
  );

  const transactionBundleFeesEstimateView = (
    <p className={transactionBundleConfig.isSponsored ? "pt-2" : "pt-0"}>
      Transaction Cost: ~
      <InfoTooltip
        content={
          <div className="text-start">
            This is an estimate of the total transaction cost to complete this
            action. If you have the default settings enabled, we'll sponsor your
            transaction with an external ETH balance then refund ourselves via
            your ETHx balance.
          </div>
        }
        target={
          <span className="text-decoration-underline">
            {transactionBundleFeesDisplay}{" "}
            {transactionBundleConfig.isSponsored ? "ETHx" : "ETH"}
          </span>
        }
      />
    </p>
  );

  const yearlyTotalView = (
    <p className="border-top pt-2">
      Year 1 Total: ~
      <InfoTooltip
        content={
          <div className="text-start">
            This projection is provided for ETHx token budgeting purposes. If
            you update your For Sale Price or sell the parcel, your required
            outlay will change.
          </div>
        }
        target={
          <span className="text-decoration-underline">
            {claimPayment && newAnnualNetworkFee && streamBuffer
              ? `${truncateEth(
                  formatBalance(
                    claimPayment.add(newAnnualNetworkFee).add(streamBuffer)
                  ),
                  8
                )} ${PAYMENT_TOKEN}`
              : `N/A`}
          </span>
        }
      />
    </p>
  );

  const initialTransferView = (
    <p className="border-top pt-2">
      Initial Transfer:{" "}
      <InfoTooltip
        content={
          <div className="text-start">
            This is the total ETHx you'll transfer (or have transferred back to
            you) to complete this transaction. Always make sure you have enough
            ETHx above this amount to sustain your Network Fee Stream.
          </div>
        }
        target={
          <span className="text-decoration-underline">
            {newAnnualNetworkFee && streamBuffer
              ? `${truncateEth(
                  formatBalance(
                    streamBuffer
                      .add(claimPayment ?? 0)
                      .add(
                        transactionBundleFeesEstimate &&
                          transactionBundleConfig.isSponsored
                          ? transactionBundleFeesEstimate
                          : 0
                      )
                  ),
                  8
                )} ${PAYMENT_TOKEN}`
              : `N/A`}
          </span>
        }
      />
    </p>
  );

  return (
    <div>
      <div className="d-flex justify-content-between gap-2">
        <h4>Transaction Summary</h4>
        {smartAccount?.safe && (
          <div>
            <Button
              variant="link"
              className="shadow-none p-0"
              onClick={() => setShowTransactionBundleConfigModal(true)}
            >
              <Image src="settings.svg" alt="settings" width={32} />
            </Button>
            <TransactionBundleConfigModal
              show={showTransactionBundleConfigModal}
              handleClose={() => setShowTransactionBundleConfigModal(false)}
              smartAccount={smartAccount}
              transactionBundleConfig={transactionBundleConfig}
              setTransactionBundleConfig={setTransactionBundleConfig}
              existingAnnualNetworkFee={existingAnnualNetworkFee}
              newAnnualNetworkFee={newAnnualNetworkFee}
            />
          </div>
        )}
      </div>
      <>
        {paymentView}
        {!smartAccount?.safe && streamView}
        {streamBufferView}
        {smartAccount?.safe &&
          interactionState === STATE.PARCEL_EDITING &&
          !transactionBundleConfig.isSponsored &&
          streamView}
        {transactionBundleFeesEstimate &&
        transactionBundleFeesEstimate.gt(0) &&
        transactionBundleConfig.isSponsored
          ? transactionBundleFeesEstimateView
          : null}
        {transactionBundleFeesEstimate &&
        transactionBundleFeesEstimate.gt(0) &&
        !transactionBundleConfig.isSponsored &&
        interactionState === STATE.PARCEL_EDITING
          ? transactionBundleFeesEstimateView
          : null}
        {smartAccount?.safe &&
        (interactionState !== STATE.PARCEL_EDITING ||
          transactionBundleConfig.isSponsored)
          ? initialTransferView
          : interactionState === STATE.CLAIM_SELECTED
          ? yearlyTotalView
          : null}
        {smartAccount?.safe &&
          interactionState !== STATE.PARCEL_EDITING &&
          streamView}
        {smartAccount?.safe &&
          interactionState === STATE.PARCEL_EDITING &&
          transactionBundleConfig.isSponsored &&
          streamView}
        {transactionBundleFeesEstimate &&
        transactionBundleFeesEstimate.gt(0) &&
        !transactionBundleConfig.isSponsored &&
        interactionState !== STATE.PARCEL_EDITING
          ? transactionBundleFeesEstimateView
          : null}
      </>
    </div>
  );
}

export default TransactionSummaryView;
