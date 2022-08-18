import { BigNumber } from "ethers";

export function fromRateToValue(
  contributionRate: BigNumber,
  perSecondFeeNumerator: BigNumber,
  perSecondFeeDenominator: BigNumber
) {
  return contributionRate
    .mul(perSecondFeeDenominator)
    .div(perSecondFeeNumerator);
}

export function fromValueToRate(
  value: BigNumber,
  perSecondFeeNumerator: BigNumber,
  perSecondFeeDenominator: BigNumber
) {
  return value.mul(perSecondFeeNumerator).div(perSecondFeeDenominator);
}

export function calculateTimeString(remaining) {
  if (remaining <= 0) {
    return "0d 0h 0m 0s";
  }

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
