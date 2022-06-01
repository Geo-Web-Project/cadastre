import { BigNumber } from "ethers";
import * as React from "react";
import { NETWORK_ID } from "../../lib/constants";
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
};

type TransactionSummaryViewProps = SidebarProps & {
  existingNetworkFee?: BigNumber;
  newNetworkFee: BigNumber;
  currentRequiredBid?: string;
  /** during the fair launch period (true) or after (false). */
  isFairLaunch?: boolean;
};

function TransactionSummaryView({
  existingNetworkFee = BigNumber.from(0),
  newNetworkFee,
  provider,
  currentRequiredBid,
  isFairLaunch,
}: TransactionSummaryViewProps) {
  const [currentChainID, setCurrentChainID] =
    React.useState<number>(NETWORK_ID);

  React.useEffect(() => {
    (async () => {
      const { chainId } = await provider.getNetwork();
      setCurrentChainID(chainId);
    })();
  }, [provider]);

  const txnNeeded = !existingNetworkFee.eq(newNetworkFee);

  const networkFeeDelta = newNetworkFee.sub(existingNetworkFee);

  const stream = networkFeeDelta
    ? truncateEth(formatBalance(networkFeeDelta), 18)
    : "0";

  const streamBuffer = networkFeeDelta.mul(
    depositHoursMap[currentChainID] * 60 * 60
  );

  const streamBufferDisplay = truncateEth(formatBalance(streamBuffer), 18);

  return (
    <div>
      <h3>Transaction Summary (ETHx)</h3>
      {txnNeeded ? (
        <>
          <p>
            {isFairLaunch
              ? `Max Claim Payment (to Treasury): ${currentRequiredBid}`
              : "Claim Payment: 0.00"}
          </p>
          <p>
            Stream: {networkFeeDelta.gt(0) ? "+" + stream : stream}
            {"/s"}
          </p>
          <p>
            Stream Buffer:{" "}
            {streamBuffer.gt(0)
              ? "+" + streamBufferDisplay
              : streamBufferDisplay}
          </p>
        </>
      ) : (
        <>
          <p>Claim Payment: N/A</p>
          <p>Stream: N/A</p>
          <p>Stream Buffer: N/A</p>
        </>
      )}
    </div>
  );
}

export default TransactionSummaryView;
