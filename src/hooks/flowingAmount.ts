import { useState, useEffect } from "react";

const ANIMATION_MINIMUM_STEP_TIME = 100;

export default function useFlowingAmount(
  startingAmount: bigint,
  startingTimestamp: number,
  flowRate: bigint
) {
  const [flowingAmount, setFlowingAmount] = useState(startingAmount);

  useEffect(() => {
    if (flowRate === BigInt(0)) {
      setFlowingAmount(startingAmount);

      return;
    }

    let lastAnimationTimestamp: DOMHighResTimeStamp = 0;

    const animationStep = (currentAnimationTimestamp: DOMHighResTimeStamp) => {
      animationFrameId = window.requestAnimationFrame(animationStep);

      if (
        currentAnimationTimestamp - lastAnimationTimestamp >
        ANIMATION_MINIMUM_STEP_TIME
      ) {
        lastAnimationTimestamp = currentAnimationTimestamp;

        const elapsedTimeInMilliseconds = BigInt(
          Date.now() - startingTimestamp * 1000
        );
        const flowingAmount =
          startingAmount +
          (flowRate * elapsedTimeInMilliseconds) / BigInt(1000);

        setFlowingAmount(flowingAmount);
      }
    };

    let animationFrameId = window.requestAnimationFrame(animationStep);

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [startingAmount, startingTimestamp, flowRate]);

  return flowingAmount;
}
