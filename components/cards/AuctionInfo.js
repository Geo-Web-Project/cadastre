import * as React from "react";
import { PAYMENT_TOKEN } from "../../lib/constants";
import BN from "bn.js";
import { ethers } from "ethers";

function _calculateAuctionValue(auctionLength, auctionEndDate, value) {
  let now = new Date();
  if (now > auctionEndDate) {
    return new BN(0);
  }

  let auctionTimeRemaining = auctionEndDate - now;

  return new BN(value)
    .mul(new BN(auctionTimeRemaining))
    .div(new BN(auctionLength * 1000));
}

function _calculateTimeString(remaining) {
  if (remaining <= 0) {
    return "0d 0h 0m 0s";
  }
  let days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  let hours = Math.floor(
    (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  let minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  let seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function AuctionInfo({
  purchaserContract,
  licenseInfo,
  auctionValue,
  setAuctionValue,
}) {
  let [auctionLength, setAuctionLength] = React.useState(null);
  let [auctionTimeRemaining, setAuctionTimeRemaining] = React.useState(null);

  React.useEffect(async () => {
    if (!purchaserContract) {
      return;
    }

    let _auctionLength = await purchaserContract.dutchAuctionLengthInSeconds();
    setAuctionLength(_auctionLength);

    // Set timer
    if (auctionTimeRemaining == null) {
      setInterval(() => {
        let _auctionEndDate = new Date(
          licenseInfo.expirationTimestamp * 1000 + _auctionLength * 1000
        );
        let _auctionTimeRemaining = _auctionEndDate - new Date();

        setAuctionTimeRemaining(_auctionTimeRemaining);

        let newAuctionValue = _calculateAuctionValue(
          _auctionLength,
          _auctionEndDate,
          licenseInfo.value
        );
        setAuctionValue(newAuctionValue);
      }, 500);
    }
  }, [purchaserContract]);

  let auctionEndDate;
  if (auctionLength && licenseInfo) {
    auctionEndDate = new Date(
      licenseInfo.expirationTimestamp * 1000 + auctionLength * 1000
    );
  }

  let isLoading =
    auctionEndDate == null ||
    auctionTimeRemaining == null ||
    auctionValue == null;
  const spinner = (
    <div className="spinner-border" role="status">
      <span className="sr-only">Loading...</span>
    </div>
  );

  return (
    <>
      <p className="text-truncate">
        <span className="font-weight-bold">Current Auction Value:</span>
        <br />{" "}
        {isLoading
          ? spinner
          : `${ethers.utils.formatEther(auctionValue)} ${PAYMENT_TOKEN}`}
      </p>
      <p className="text-truncate">
        <span className="font-weight-bold">Auction End:</span>
        <br /> {isLoading ? spinner : auctionEndDate.toUTCString()}
      </p>
      <p className="text-truncate">
        <span className="font-weight-bold">Time Remaining:</span>
        <br />{" "}
        {isLoading ? spinner : _calculateTimeString(auctionTimeRemaining)}
      </p>
    </>
  );
}

export default AuctionInfo;
