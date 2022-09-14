import { BigNumber } from "ethers";

/**
 * @see https://docs.superfluid.finance/superfluid/protocol-overview/super-apps/super-app#super-app-deposits
 */
const depositHoursMap: Record<number, number> = {
  // mainnet
  1: 4,
  // rinkeby
  4: 1,
  // goerli
  5: 1,
  // optimism-kovan
  69: 1,
};

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

export function calculateBufferNeeded(
  stream: BigNumber,
  currentChainID: number
) {
  return stream.mul(depositHoursMap[currentChainID]).div(365 * 24);
}

export function calculateAuctionValue(
  forSalePrice: BigNumber,
  auctionStart: BigNumber,
  auctionLength: number
) {
  const blockTimestamp = BigNumber.from(Math.floor(Date.now() / 1000));
  const length = BigNumber.from(auctionLength);
  if (blockTimestamp.gt(auctionStart.add(length))) {
    return BigNumber.from(0);
  }

  const timeElapsed = blockTimestamp.sub(auctionStart);
  const priceDecrease = forSalePrice.mul(timeElapsed).div(length);
  return forSalePrice.sub(priceDecrease);
}

function calculateAuctionValue(
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
