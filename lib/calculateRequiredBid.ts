/**
 * @see https://github.com/Geo-Web-Project/core-contracts/blob/bb6b1d0e12c03615e1ab21dc7d5e6d19abfb9cc4/contracts/FairLaunchClaimer.sol#L80-L93
 */

import { BigNumber } from "ethers";

export const calculateRequiredBid = (
  auctionStart: BigNumber,
  auctionEnd: BigNumber,
  startingBid: BigNumber,
  endingBid: BigNumber
) => {
  const blockTimestamp = Date.now();
  if (blockTimestamp > auctionEnd.toNumber()) {
    return endingBid;
  }

  const timeElapsed = blockTimestamp - auctionStart.toNumber();
  const auctionDuration = auctionEnd.toNumber() - auctionStart.toNumber();
  const priceDecrease =
    (startingBid.toNumber() * timeElapsed) / auctionDuration;

  return startingBid.toNumber() - priceDecrease;
};
