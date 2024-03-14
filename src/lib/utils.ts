import { formatEther } from "viem";
import { BigNumber } from "ethers";
import { Framework, NativeAssetSuperToken } from "@superfluid-finance/sdk-core";
import { IPFS_GATEWAY } from "./constants";

export enum TimeInterval {
  DAY = "/day",
  WEEK = "/week",
  MONTH = "/month",
  YEAR = "/year",
}

export const unitOfTime = {
  [TimeInterval.DAY]: "days",
  [TimeInterval.WEEK]: "weeks",
  [TimeInterval.MONTH]: "months",
  [TimeInterval.YEAR]: "years",
};

export function weightedPick(items: any[], weights: number[]) {
  let i;

  for (i = 1; i < weights.length; i++) {
    weights[i] += weights[i - 1];
  }

  const chance = Math.random() * weights[weights.length - 1];

  for (i = 0; i < weights.length; i++) {
    if (weights[i] > chance) {
      break;
    }
  }

  return items[i];
}

export function getRandomNumberInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

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
  paymentToken: NativeAssetSuperToken,
  stream: BigNumber
) {
  return await sfFramework.cfaV1.contract
    .connect(sfFramework.settings.provider)
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

export function getGatewayUrl(uri: string) {
  return uri.startsWith("ipfs://") ? `${IPFS_GATEWAY}/${uri.slice(7)}` : uri;
}

export function perSecondToPerMonth(amount: number) {
  return amount * 2628000;
}

export function fromTimeUnitsToSeconds(units: number, type: string) {
  let result = units;

  switch (type) {
    case "minutes":
      result = units * 60;
      break;
    case "hours":
      result = units * 3600;
      break;
    case "days":
      result = units * 86400;
      break;
    case "weeks":
      result = units * 604800;
      break;
    case "months":
      result = units * 2628000;
      break;
    case "years":
      result = units * 31536000;
      break;
    default:
      break;
  }

  return result;
}

export function isNumber(value: string) {
  return !isNaN(Number(value)) && !isNaN(parseFloat(value));
}

export function roundWeiAmount(amount: bigint, digits: number) {
  return parseFloat(Number(formatEther(amount)).toFixed(digits)).toString();
}

export function convertStreamValueToInterval(
  amount: bigint,
  from: TimeInterval,
  to: TimeInterval
) {
  return roundWeiAmount(
    (amount / BigInt(fromTimeUnitsToSeconds(1, unitOfTime[from]))) *
      BigInt(fromTimeUnitsToSeconds(1, unitOfTime[to])),
    4
  );
}

/*
 * Division of ints only square root
 * https://en.wikipedia.org/wiki/Integer_square_root#Using_only_integer_division
 */
export function sqrtBigInt(s: bigint) {
  if (s <= BigInt(1)) {
    return s;
  }

  let x0 = s / BigInt(2);
  let x1 = (x0 + s / x0) / BigInt(2);

  while (x1 < x0) {
    x0 = x1;
    x1 = (x0 + s / x0) / BigInt(2);
  }

  return x0;
}

export function absBigInt(n: bigint) {
  return n < 0n ? -n : n;
}

export function clampText(str: string, newLength: number) {
  if (str.length <= newLength) {
    return str;
  }

  return `${str.slice(0, newLength - 4)}...`;
}

export function truncateStr(str: string, strLen: number) {
  if (str.length <= strLen) {
    return str;
  }

  const separator = "...";

  const sepLen = separator.length,
    charsToShow = strLen - sepLen,
    frontChars = Math.ceil(charsToShow / 2),
    backChars = Math.floor(charsToShow / 2);

  return (
    str.substr(0, frontChars) + separator + str.substr(str.length - backChars)
  );
}

export function formatNumberWithCommas(n: number) {
  const parts = (n < 0 ? -n : n).toString().split(".");
  const whole = parts[0];
  const fractional = parts[1];
  let i = whole.length;
  let result = "";

  while (i--) {
    result = `${i === 0 ? "" : (whole.length - i) % 3 ? "" : ","}${whole.charAt(
      i
    )}${result}`;
  }

  return `${n < 0 ? "-" : ""}${result}${fractional ? "." : ""}${
    fractional ?? ""
  }`;
}

export function extractTwitterHandle(url: string) {
  if (!url) return null;
  const match = url.match(/^https?:\/\/(www\.)?twitter.com\/@?(?<handle>\w+)/);
  return match?.groups?.handle ? `@${match.groups.handle}` : null;
}
