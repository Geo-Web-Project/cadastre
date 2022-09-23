import { BigNumber, ethers } from "ethers";
import { Framework, NativeAssetSuperToken } from "@superfluid-finance/sdk-core";

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

export function calculateTimeString(remaining: number) {
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

export async function calculateBufferNeeded(
  sfFramework: Framework,
  provider: ethers.providers.Web3Provider,
  paymentToken: NativeAssetSuperToken,
  stream: BigNumber
) {
  return await sfFramework.cfaV1.contract
    .connect(provider)
    .getDepositRequiredForFlowRate(paymentToken.address, stream);
}

export function calculateAuctionValue(
  forSalePrice: BigNumber,
  auctionStart: BigNumber,
  auctionLength: BigNumber
) {
  const blockTimestamp = BigNumber.from(Math.floor(Date.now() / 1000));
  if (blockTimestamp.gt(auctionStart.add(auctionLength))) {
    return BigNumber.from(0);
  }

  const timeElapsed = blockTimestamp.sub(auctionStart);
  const priceDecrease = forSalePrice.mul(timeElapsed).div(auctionLength);
  return forSalePrice.sub(priceDecrease);
}
