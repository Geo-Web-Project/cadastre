import * as React from "react";
import { BigNumber, ethers } from "ethers";
import { OffCanvasPanelProps } from "../OffCanvasPanel";
import InfoTooltip from "../InfoTooltip";
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
};

function TransactionSummaryView({
  existingAnnualNetworkFee = BigNumber.from(0),
  newAnnualNetworkFee,
  existingNetworkFee = BigNumber.from(0),
  newNetworkFee,
  account,
  interactionState,
  licenseOwner,
  claimPayment,
  collateralDeposit,
  currentForSalePrice,
  penaltyPayment,
  sfFramework,
  paymentToken,
}: TransactionSummaryViewProps) {
  const { isMobile } = useMediaQuery();

  const txnReady = newAnnualNetworkFee !== null;

  const isDeltaPayment = !collateralDeposit && !claimPayment;

  const networkFeeDelta = newAnnualNetworkFee
    ? newAnnualNetworkFee.sub(existingAnnualNetworkFee)
    : BigNumber.from(0);

  const stream =
    !isDeltaPayment && newAnnualNetworkFee
      ? newAnnualNetworkFee
      : networkFeeDelta ?? BigNumber.from(0);

  const streamDisplay = truncateEth(formatBalance(stream), 18);

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
        {interactionState === STATE.PARCEL_RECLAIMING &&
        account.toLowerCase() !== licenseOwner?.toLowerCase()
          ? "Max Claim Payment (to Licensor): "
          : "Claim Payment: "}
        <InfoTooltip
          position={{ top: isMobile }}
          content={
            <div style={{ textAlign: "left" }}>
              {interactionState === STATE.PARCEL_RECLAIMING &&
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
    <p>
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
            {currentForSalePrice && reducedBuffer
              ? `${truncateEth(
                  formatBalance(currentForSalePrice.add(reducedBuffer)),
                  8
                )} ${PAYMENT_TOKEN}`
              : `N/A`}
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

  return (
    <div>
      <div className="d-flex justify-content-between gap-2">
        <h4>Transaction Summary</h4>
      </div>
      <>
        {interactionState === STATE.PARCEL_ACCEPTING_BID && salePriceView}
        {interactionState === STATE.PARCEL_ACCEPTING_BID && bufferReductionView}
        {interactionState !== STATE.PARCEL_ACCEPTING_BID && paymentView}
        {streamView}
        {interactionState !== STATE.PARCEL_ACCEPTING_BID && streamBufferView}
        {interactionState === STATE.PARCEL_ACCEPTING_BID && netReceivedView}
        {interactionState === STATE.PARCEL_ACCEPTING_BID && streamReductionView}
        {interactionState === STATE.CLAIM_SELECTED ? yearlyTotalView : null}
      </>
    </div>
  );
}

export default TransactionSummaryView;
