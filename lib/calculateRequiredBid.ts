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
  const blockTimestamp = BigNumber.from(Math.floor(Date.now() / 1000));
  console.log(blockTimestamp.toString(), auctionEnd.toString());
  if (blockTimestamp.gt(auctionEnd)) {
    return endingBid;
  }

  const timeElapsed = blockTimestamp.sub(auctionStart);
  const auctionDuration = auctionEnd.sub(auctionStart);
  const priceDecrease = startingBid
    .sub(endingBid)
    .mul(timeElapsed)
    .div(auctionDuration);

  return startingBid.sub(priceDecrease);
};
