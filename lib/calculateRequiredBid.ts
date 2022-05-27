/**
 * @see https://github.com/Geo-Web-Project/core-contracts/blob/bb6b1d0e12c03615e1ab21dc7d5e6d19abfb9cc4/contracts/FairLaunchClaimer.sol#L80-L93
 */

import { BigNumber, ethers } from "ethers";

export const calculateRequiredBid = (
  auctionStart: BigNumber,
  auctionEnd: BigNumber,
  startingBid: BigNumber,
  endingBid: BigNumber
) => {
  const blockTimestamp = ethers.utils.parseEther(Date.now().toString());
  if (blockTimestamp.lt(auctionEnd)) {
    return endingBid;
  }

  const timeElapsed = auctionStart.mul(-1).add(blockTimestamp);
  const auctionDuration = auctionStart.mul(-1).add(auctionEnd);
  const priceDecrease = startingBid.mul(timeElapsed).div(auctionDuration);

  return priceDecrease.mul(-1).add(startingBid);
};
