import { useState, useEffect } from "react";
import { BigNumber } from "ethers";
import { sfSubgraph } from "../redux/store";
import { NETWORK_ID } from "./constants";

const ANIMATION_MINIMUM_STEP_TIME = 100;

function useSuperTokenBalance(account: string, token: string) {
  const { isLoading, data } = sfSubgraph.useAccountTokenSnapshotsQuery({
    chainId: NETWORK_ID,
    filter: {
      account,
      token,
    },
  });

  const [superTokenBalance, setSuperTokenBalance] =
    useState<BigNumber>(BigNumber.from(0));

  useEffect(() => {
    if (!data || isLoading) {
      return;
    }

    const accountTokenSnapshot = data.items[0];

    const balanceBigNumber = BigNumber.from(
      accountTokenSnapshot ? accountTokenSnapshot.balanceUntilUpdatedAt : "0"
    );
    const flowRateBigNumber = BigNumber.from(
      accountTokenSnapshot ? accountTokenSnapshot.totalNetFlowRate : "0"
    );
    const balanceTimestampBigNumber = BigNumber.from(
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

        const currentTimestampBigNumber = BigNumber.from(
          new Date().getTime()
        );

        setSuperTokenBalance(
          balanceBigNumber.add(
            currentTimestampBigNumber
              .sub(balanceTimestampBigNumber)
              .mul(flowRateBigNumber)
              .div(1000)
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
  }, [data]);

  return { superTokenBalance };
}

export { useSuperTokenBalance };
