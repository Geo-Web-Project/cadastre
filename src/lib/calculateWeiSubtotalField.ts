import { ethers, BigNumber } from "ethers";

export function calculateWeiSubtotalField(displayValue: string | undefined) {
  if (displayValue && displayValue.length > 0 && !isNaN(Number(displayValue))) {
    return ethers.utils.parseEther(displayValue);
  } else {
    return BigNumber.from(0);
  }
}
