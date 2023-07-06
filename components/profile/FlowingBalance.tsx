// From https://github.com/superfluid-finance/protocol-monorepo/blob/dev/examples/sdk-redux-react-typecript/src/FlowingBalance.tsx

import React, { FC, ReactElement, useEffect, useState } from "react";
import { ethers } from "ethers";
// eslint-disable-next-line import/named
import { AccountTokenSnapshot } from "@superfluid-finance/sdk-core";

const ANIMATION_MINIMUM_STEP_TIME = 100;

type FlowingBalanceProps = {
  accountTokenSnapshot: AccountTokenSnapshot | undefined;
  format?: (flowingBalanceWei: string) => string;
  balance?: (
    accountTokenSnapshot: AccountTokenSnapshot | undefined
  ) => ethers.BigNumber;
};

export const FlowingBalance: FC<FlowingBalanceProps> = ({
  accountTokenSnapshot,
  format = (x) => x,
  balance = (accountTokenSnapshot: AccountTokenSnapshot | undefined) =>
    ethers.BigNumber.from(
      accountTokenSnapshot ? accountTokenSnapshot.balanceUntilUpdatedAt : "0"
    ),
}): ReactElement => {
  const [formattedValue, setFormattedValue] = useState("");
  useEffect(() => {
    const balanceBigNumber = balance(accountTokenSnapshot);
    const flowRateBigNumber = ethers.BigNumber.from(
      accountTokenSnapshot ? accountTokenSnapshot.totalNetFlowRate : "0"
    );
    const balanceTimestampBigNumber = ethers.BigNumber.from(
      accountTokenSnapshot ? accountTokenSnapshot.updatedAtTimestamp : "0"
    ).mul(1000);

    let stopAnimation = false;
    let lastAnimationTimestamp: DOMHighResTimeStamp = 0;

    const animationStep = (currentAnimationTimestamp: DOMHighResTimeStamp) => {
      if (
        currentAnimationTimestamp - lastAnimationTimestamp >
        ANIMATION_MINIMUM_STEP_TIME
      ) {
        if (stopAnimation) {
          return;
        }

        const currentTimestampBigNumber = ethers.BigNumber.from(
          new Date().getTime()
        );

        setFormattedValue(
          format(
            balanceBigNumber
              .add(
                currentTimestampBigNumber
                  .sub(balanceTimestampBigNumber)
                  .mul(flowRateBigNumber)
                  .div(1000)
              )
              .toString()
          )
        );

        lastAnimationTimestamp = currentAnimationTimestamp;
      }
      window.requestAnimationFrame(animationStep);
    };

    window.requestAnimationFrame(animationStep);

    return () => {
      stopAnimation = true;
    };
  }, [accountTokenSnapshot, format]);
  return <span>{formattedValue}</span>;
};
