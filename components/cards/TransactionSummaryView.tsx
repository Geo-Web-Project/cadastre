import { BigNumber, ethers } from "ethers";
import * as React from "react";
import { NETWORK_ID, PAYMENT_TOKEN } from "../../lib/constants";
import { formatBalance } from "../../lib/formatBalance";
import { truncateEth } from "../../lib/truncate";
import { SidebarProps } from "../Sidebar";

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

  const txnReady = newNetworkFee
    ? !existingNetworkFee.eq(newNetworkFee)
    : false;

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
        {isFairLaunch ? `Max Claim Payment (to Treasury): ` : "Claim Payment: "}
        {truncateEth(ethers.utils.formatEther(claimPayment), 4)} {PAYMENT_TOKEN}
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
          Collateral Deposit: {displayCollateralDeposit} {PAYMENT_TOKEN}
        </p>
        <p>
          &emsp;Purchase Payment: {displayCurrentForSalePrice} {PAYMENT_TOKEN}
        </p>
        <p>
          &emsp;Refundable Collateral: {displayRefundableCollateral}{" "}
          {PAYMENT_TOKEN}
        </p>
      </>
    );
  } else if (penaltyPayment) {
    const displayPenaltyPayment = formatBalance(penaltyPayment);
    paymentView = (
      <p>
        Penalty Payment: {displayPenaltyPayment} {PAYMENT_TOKEN}
      </p>
    );
  }

  const streamView = txnReady ? (
    <p>
      Stream:{" "}
      {isDeltaPayment && networkFeeDelta.gt(0)
        ? "+" + streamDisplay
        : streamDisplay}
      {` ${PAYMENT_TOKEN}/s`}
    </p>
  ) : (
    <p>Stream: N/A</p>
  );

  const streamBufferView = txnReady ? (
    <p>
      Stream Buffer:{" "}
      {isDeltaPayment && streamBuffer.gt(0)
        ? "+" + streamBufferDisplay
        : streamBufferDisplay}
      {` ${PAYMENT_TOKEN}`}
    </p>
  ) : (
    <p>Stream Buffer: N/A</p>
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
