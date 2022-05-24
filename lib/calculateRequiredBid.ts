/**
 * @see https://github.com/Geo-Web-Project/core-contracts/blob/bb6b1d0e12c03615e1ab21dc7d5e6d19abfb9cc4/contracts/FairLaunchClaimer.sol#L80-L93
 *
 * @param block TODO
 * @param auctionStart TODO
 * @param auctionEnd TODO
 * @param startingBid TODO
 * @param endingBid TODO
 * @returns TODO
 */

export const calculateRequiredBid = (
  block: any,
  auctionStart: any,
  auctionEnd: any,
  startingBid: any,
  endingBid: any
) => {
  if (block.timestamp > auctionEnd) {
    return endingBid;
  }

  const timeElapsed = block.timestamp - auctionStart;
  const auctionDuration = auctionEnd - auctionStart;
  const priceDecrease = (startingBid * timeElapsed) / auctionDuration;

  return startingBid - priceDecrease;
};
