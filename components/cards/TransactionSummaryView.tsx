import { BigNumber, ethers } from "ethers";
import * as React from "react";
import { PAYMENT_TOKEN } from "../../lib/constants";
import { formatBalance } from "../../lib/formatBalance";
import { truncateEth } from "../../lib/truncate";
import { calculateBufferNeeded } from "../../lib/utils";
import { SidebarProps } from "../Sidebar";
import InfoTooltip from "../InfoTooltip";
import { STATE } from "../Map";

type TransactionSummaryViewProps = SidebarProps & {
  existingNetworkFee?: BigNumber;
  newNetworkFee: BigNumber | null;
  existingAnnualNetworkFee?: BigNumber;
  newAnnualNetworkFee: BigNumber | null;
  claimPayment?: BigNumber;
  collateralDeposit?: BigNumber;
  penaltyPayment?: BigNumber;
  currentForSalePrice?: BigNumber;
  licenseOwner?: string;
  /** during the fair launch period (true) or after (false). */
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

  const [streamBuffer, setStreamBuffer] = React.useState<BigNumber | null>(
    null
  );
  const [lastStream, setLastStream] = React.useState<BigNumber | null>(null);

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
    ? truncateEth(formatBalance(streamBuffer), 18)
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
          content={
            <div style={{ textAlign: "left" }}>
              {interactionState == STATE.PARCEL_RECLAIMING &&
              account.toLowerCase() === licenseOwner?.toLowerCase()
                ? "No one-time payment is required to reclaim your foreclosed parcel—just restart a network fee stream."
                : `Unclaimed parcels require a minimum one-time payment of ${truncateEth(
                    ethers.utils.formatEther(claimPayment),
                    8
                  )} ETHx. This is enforced to prevent low-value claims and squatting.`}
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
          &emsp;Purchase Payment:{" "}
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
          &emsp;Refundable Collateral:{" "}
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
    <p>
      Stream:{" "}
      <InfoTooltip
        content={
          <div style={{ textAlign: "left" }}>
            {collateralDeposit
              ? "This is the amount you authorize your network fee stream to be increased if your bid is accepted."
              : "The amount that will be added (or subtracted) from your total network fee stream."}
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
    <p>
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

  return (
    <div>
      <h3>Transaction Summary</h3>
      <>
        {paymentView}
        {streamView}
        {streamBufferView}
      </>
    </div>
  );
}

export default TransactionSummaryView;
