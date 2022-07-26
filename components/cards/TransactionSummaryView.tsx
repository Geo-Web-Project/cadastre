import { BigNumber, ethers } from "ethers";
import * as React from "react";
import { NETWORK_ID, PAYMENT_TOKEN } from "../../lib/constants";
import { formatBalance } from "../../lib/formatBalance";
import { truncateEth } from "../../lib/truncate";
import { SidebarProps } from "../Sidebar";
import InfoTooltip from "../InfoTooltip";
import { STATE } from "../Map";

/**
 * @see https://docs.superfluid.finance/superfluid/protocol-overview/super-apps/super-app#super-app-deposits
 */
const depositHoursMap: Record<number, number> = {
  // mainnet
  1: 8,
  // rinkeby
  4: 2,
  // optimism-kovan
  69: 2,
};

type TransactionSummaryViewProps = SidebarProps & {
  existingNetworkFee?: BigNumber;
  newNetworkFee: BigNumber | null;
  claimPayment?: BigNumber;
  collateralDeposit?: BigNumber;
  penaltyPayment?: BigNumber;
  currentForSalePrice?: BigNumber;
  /** during the fair launch period (true) or after (false). */
  isFairLaunch?: boolean;
};

function TransactionSummaryView({
  existingNetworkFee = BigNumber.from(0),
  newNetworkFee,
  account,
  interactionState,
  licenseOwner,
  provider,
  isFairLaunch,
  claimPayment,
  collateralDeposit,
  currentForSalePrice,
  penaltyPayment,
}: TransactionSummaryViewProps) {
  const [currentChainID, setCurrentChainID] =
    React.useState<number>(NETWORK_ID);

  React.useEffect(() => {
    (async () => {
      const { chainId } = await provider.getNetwork();
      setCurrentChainID(chainId);
    })();
  }, [provider]);

  const txnReady = newNetworkFee != null;

  const isDeltaPayment = !collateralDeposit && !claimPayment;

  const networkFeeDelta = newNetworkFee
    ? newNetworkFee.sub(existingNetworkFee)
    : BigNumber.from(0);

  const stream =
    !isDeltaPayment && newNetworkFee
      ? newNetworkFee
      : networkFeeDelta ?? BigNumber.from(0);

  const streamDisplay = truncateEth(formatBalance(stream), 18);

  const streamBuffer = stream.mul(depositHoursMap[currentChainID] * 60 * 60);

  const streamBufferDisplay = truncateEth(formatBalance(streamBuffer), 18);

  let paymentView;

  if (claimPayment) {
    paymentView = (
      <p>
        {isFairLaunch
          ? `Max Claim Payment (to Treasury): `
          : interactionState == STATE.PARCEL_RECLAIMING &&
            account.toLowerCase() != licenseOwner.toLowerCase()
          ? "Max Claim Payment (to Licensor): "
          : "Claim Payment: "}
        <InfoTooltip
          content={
            <div style={{ textAlign: "left" }}>
              {isFairLaunch
                ? "This is the amount you authorize for your claim payment. You'll only pay the Dutch auction price at the time of transaction confirmation."
                : "Unclaimed parcels do not require a one-time payment after the conclusion of the Fair Launch Auction. Network fee payments still apply."}
            </div>
          }
          target={
            <span style={{ textDecoration: "underline" }}>
              {truncateEth(ethers.utils.formatEther(claimPayment), 4)}{" "}
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
            {txnReady ? (
              <>
                {isDeltaPayment ? "+" + streamDisplay : streamDisplay}
                {` ${PAYMENT_TOKEN}/s`}
              </>
            ) : (
              `N/A`
            )}
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
            {collateralDeposit ? (
              <>
                This is the amount you authorize to add to your buffer deposit
                if your bid is accepted.
                <br />
                <br />
                It is used to incentivize closing your stream(s) if your ETHx
                balance reaches 0.
              </>
            ) : (
              <>
                This is the required adjustment to your stream buffer deposit.
                <br />
                <br />
                It is used to incentivize closing your stream(s) if your ETHx
                balance reaches 0.
              </>
            )}
          </div>
        }
        target={
          <span style={{ textDecoration: "underline" }}>
            {txnReady ? (
              <>
                {isDeltaPayment
                  ? "+" + streamBufferDisplay
                  : streamBufferDisplay}
                {` ${PAYMENT_TOKEN}`}
              </>
            ) : (
              `N/A`
            )}
          </span>
        }
      />
    </p>
  );

  /**
   * For use for "Foreclosure Action", #TODO
   * let foreclosureActionView = (
    <p>
      Max Claim Payment (to Licensor):{" "}
      <InfoTooltip
        content={
          <div style={{ textAlign: "left" }}>
            This is the amount you authorize for your claim payment. You'll only
            pay the Dutch auction price at the time of transaction confirmation.
          </div>
        }
        target={<></>}
      />
    </p>
  );
   */

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
