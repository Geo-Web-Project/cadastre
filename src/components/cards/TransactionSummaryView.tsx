import * as React from "react";
import { BigNumber, ethers } from "ethers";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import { OffCanvasPanelProps } from "../OffCanvasPanel";
import InfoTooltip from "../InfoTooltip";
import TransactionBundleSettingsModal from "../TransactionBundleSettingsModal";
import { STATE } from "../Map";
import { PAYMENT_TOKEN } from "../../lib/constants";
import { formatBalance } from "../../lib/formatBalance";
import { truncateEth } from "../../lib/truncate";
import { calculateBufferNeeded } from "../../lib/utils";
import { useMediaQuery } from "../../lib/mediaQuery";
import { useBundleSettings } from "../../lib/transactionBundleSettings";

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
}: TransactionSummaryViewProps) {
  const { isMobile } = useMediaQuery();
  const bundleSettings = useBundleSettings();

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
  const [reducedBuffer, setReducedBuffer] = React.useState<BigNumber | null>(
    null
  );
  const [reducedStream, setReducedStream] = React.useState<BigNumber | null>(
    null
  );
  const [
    showTransactionBundleSettingsModal,
    setShowTransactionBundleSettingsModal,
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

  React.useEffect(() => {
    (async () => {
      if (
        interactionState === STATE.PARCEL_ACCEPTING_BID &&
        existingNetworkFee
      ) {
        const reducedBuffer = await calculateBufferNeeded(
          sfFramework,
          paymentToken,
          existingNetworkFee
        );
        // Multiply by 2x for user buffer and PCOLicenseDiamond buffer
        setReducedBuffer(reducedBuffer.mul(2));
        setReducedStream(existingAnnualNetworkFee);
      }
    })();
  }, [existingNetworkFee]);

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
            position={{ top: isMobile }}
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
            position={{ top: isMobile }}
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
            position={{ top: isMobile }}
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
          position={{ top: isMobile }}
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
        interactionState === STATE.PARCEL_EDITING && !bundleSettings.isSponsored
          ? "mb-2"
          : ""
      }
    >
      Stream:{" "}
      <InfoTooltip
        position={{ top: isMobile }}
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
        position={{ top: isMobile }}
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
    <p
      className={
        bundleSettings.isSponsored &&
        interactionState !== STATE.PARCEL_ACCEPTING_BID
          ? "pt-2"
          : "pt-0"
      }
    >
      Transaction Cost:{" "}
      {interactionState === STATE.PARCEL_ACCEPTING_BID ? "-" : ""}
      <InfoTooltip
        position={{ top: isMobile }}
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
            {bundleSettings.isSponsored ? "ETHx" : "ETH"}
          </span>
        }
      />
    </p>
  );

  const yearlyTotalView = (
    <p className="border-top pt-2">
      Year 1 Total: ~
      <InfoTooltip
        position={{ top: isMobile }}
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
        position={{ top: isMobile }}
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
                      .add(penaltyPayment ?? 0)
                      .add(collateralDeposit ?? 0)
                      .add(
                        transactionBundleFeesEstimate &&
                          bundleSettings.isSponsored
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

  const salePriceView = (
    <p className="pt-2">
      Sale Price:{" "}
      <InfoTooltip
        position={{ top: isMobile }}
        content={
          <div className="text-start">
            This is how much you'll receive for accepting the bid. Note that
            this amount is based on your For Sale Price, not the bidder's new
            valuation.
          </div>
        }
        target={
          <span className="text-decoration-underline">
            {currentForSalePrice
              ? `${truncateEth(
                  formatBalance(currentForSalePrice),
                  8
                )} ${PAYMENT_TOKEN}`
              : `N/A`}
          </span>
        }
      />
    </p>
  );

  const bufferReductionView = (
    <p>
      Buffer Reduction:{" "}
      <InfoTooltip
        position={{ top: isMobile }}
        content={
          <div className="text-start">
            This is how much your stream buffer will be reduced with this sale
            and returned to your ETHx balance.{" "}
          </div>
        }
        target={
          <span className="text-decoration-underline">
            {reducedBuffer
              ? `${truncateEth(
                  formatBalance(reducedBuffer),
                  8
                )} ${PAYMENT_TOKEN}`
              : `N/A`}
          </span>
        }
      />
    </p>
  );

  const streamReductionView = (
    <p>
      Stream Reduction:{" "}
      <InfoTooltip
        position={{ top: isMobile }}
        content={
          <div className="text-start">
            This is the amount your total outgoing ETHx stream will be reduced.
            (We also should append the text "/year" onto the value shown in this
            line.
          </div>
        }
        target={
          <span className="text-decoration-underline">
            {reducedStream
              ? `${truncateEth(
                  formatBalance(reducedStream),
                  8
                )} ${PAYMENT_TOKEN}/year`
              : `N/A`}
          </span>
        }
      />
    </p>
  );

  const netReceivedView = (
    <p className="border-top pt-2">
      Net Received:{" "}
      <InfoTooltip
        position={{ top: isMobile }}
        content={
          <div className="text-start">
            {" "}
            This is the net impact on your ETHx balance from this sale.
          </div>
        }
        target={
          <span className="text-decoration-underline">
            {currentForSalePrice &&
            reducedBuffer &&
            transactionBundleFeesEstimate
              ? `${truncateEth(
                  formatBalance(
                    currentForSalePrice
                      .add(reducedBuffer)
                      .sub(transactionBundleFeesEstimate)
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
              onClick={() => setShowTransactionBundleSettingsModal(true)}
            >
              <Image src="settings.svg" alt="settings" width={32} />
            </Button>
            <TransactionBundleSettingsModal
              show={showTransactionBundleSettingsModal}
              handleClose={() => setShowTransactionBundleSettingsModal(false)}
              smartAccount={smartAccount}
              paymentToken={paymentToken}
              existingAnnualNetworkFee={existingAnnualNetworkFee}
              newAnnualNetworkFee={
                interactionState === STATE.PARCEL_ACCEPTING_BID
                  ? BigNumber.from(0)
                  : newAnnualNetworkFee
              }
            />
          </div>
        )}
      </div>
      <>
        {interactionState === STATE.PARCEL_ACCEPTING_BID && salePriceView}
        {interactionState === STATE.PARCEL_ACCEPTING_BID && bufferReductionView}
        {interactionState !== STATE.PARCEL_ACCEPTING_BID && paymentView}
        {!smartAccount?.safe && streamView}
        {interactionState !== STATE.PARCEL_ACCEPTING_BID && streamBufferView}
        {smartAccount?.safe &&
          interactionState === STATE.PARCEL_EDITING &&
          !bundleSettings.isSponsored &&
          streamView}
        {transactionBundleFeesEstimate &&
        transactionBundleFeesEstimate.gt(0) &&
        bundleSettings.isSponsored
          ? transactionBundleFeesEstimateView
          : null}
        {interactionState === STATE.PARCEL_ACCEPTING_BID && netReceivedView}
        {transactionBundleFeesEstimate &&
        transactionBundleFeesEstimate.gt(0) &&
        !bundleSettings.isSponsored &&
        interactionState === STATE.PARCEL_EDITING
          ? transactionBundleFeesEstimateView
          : null}
        {smartAccount?.safe &&
        interactionState !== STATE.PARCEL_ACCEPTING_BID &&
        (interactionState !== STATE.PARCEL_EDITING ||
          bundleSettings.isSponsored)
          ? initialTransferView
          : interactionState === STATE.CLAIM_SELECTED
          ? yearlyTotalView
          : null}
        {smartAccount?.safe &&
          interactionState !== STATE.PARCEL_EDITING &&
          interactionState !== STATE.PARCEL_ACCEPTING_BID &&
          streamView}
        {interactionState === STATE.PARCEL_ACCEPTING_BID && streamReductionView}
        {smartAccount?.safe &&
          interactionState === STATE.PARCEL_EDITING &&
          bundleSettings.isSponsored &&
          streamView}
        {transactionBundleFeesEstimate &&
          transactionBundleFeesEstimate.gt(0) &&
          !bundleSettings.isSponsored &&
          interactionState !== STATE.PARCEL_EDITING &&
          transactionBundleFeesEstimateView}
      </>
    </div>
  );
}

export default TransactionSummaryView;
