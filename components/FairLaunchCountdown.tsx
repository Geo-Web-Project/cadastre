import { useState, useEffect } from "react";
import { BigNumber } from "ethers";
import Spinner from "react-bootstrap/Spinner";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

dayjs.extend(duration);

interface FairLaunchCountdownProps {
  auctionStart: BigNumber;
  setIsPreFairLaunch: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFairLaunch: React.Dispatch<React.SetStateAction<boolean>>;
}

function FairLaunchCountdown(props: FairLaunchCountdownProps) {
  const { auctionStart, setIsPreFairLaunch, setIsFairLaunch } = props;

  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const timerId = setInterval(() => {
      const deltaTime = auctionStart.toNumber() * 1000 - Date.now();

      if (deltaTime <= 0) {
        setIsPreFairLaunch(false);
        setIsFairLaunch(true);
        setCountdown("");
        clearInterval(timerId);
        return;
      }

      const duration = dayjs.duration(deltaTime);
      const hours = Math.floor(duration.asHours());
      const minutes = duration.minutes();
      const seconds = duration.seconds();

      setCountdown(
        `${hours}:${minutes >= 10 ? minutes : "0".concat(minutes.toString())}:${
          seconds >= 10 ? seconds : "0".concat(seconds.toString())
        }`
      );
    }, 900);

    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, []);

  return (
    <>
      {countdown ? (
        <div className="fs-1 text-primary text-center">
          {countdown}
          <div className="fs-6 text-light text-center">
            Countdown to Fair Launch
          </div>
        </div>
      ) : (
        <div className="d-flex justify-content-center">
          <Spinner animation="border" role="status" variant="light"></Spinner>
        </div>
      )}
    </>
  );
}

export default FairLaunchCountdown;
