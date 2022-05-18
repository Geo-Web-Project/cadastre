import * as React from "react";
import type { SidebarProps } from "../Sidebar";

type ClaimViewProps = Pick<SidebarProps, "isFairLaunch"> & {
  /** equal to the Network Fee rate divided by 31,536,000 (seconds in a 365 day year). */
  stream: string;
  /** equal to (`flowRate` - `oldFlowRate`) * 2 * 60 * 60. */
  streamBuffer: string;
};

/**
 * If `isFairLaunch` is true, then we are in the fair launch period,
 * and we should use FairClaimLaunchAction,
 * else use SimpleClaimAction
 */
function ClaimView({
  stream,
  streamBuffer,
  isFairLaunch = false,
}: ClaimViewProps) {
  return (
    <div>
      <h3>Transaction Summary (ETHx)</h3>
      <p>{isFairLaunch ? "TODO" : "Claim Payment: 0.00"}</p>
      <p>Stream: +{stream}/s</p>
      <p>Stream Buffer: +{streamBuffer}</p>
    </div>
  );
}

export default ClaimView;