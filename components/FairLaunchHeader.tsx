import { useState, useEffect } from "react";
import { BigNumber } from "ethers";
import { gql, useQuery } from "@apollo/client";
import { OverlayTrigger, Tooltip, Spinner } from "react-bootstrap";
import { PAYMENT_TOKEN } from "../lib/constants";
import { truncateEth } from "../lib/truncate";
import { formatBalance } from "../lib/formatBalance";
import { calculateRequiredBid } from "../lib/calculateRequiredBid";

const parcelsQuery = gql`
  query ParcelsClaimed($lastBlock: BigInt, $limit: Int) {
    geoWebParcels(orderBy: createdAtBlock, first: $limit) {
      id
    }
  }
`;

interface FairLaunchHeaderProps {
  auctionStart: BigNumber;
  auctionEnd: BigNumber;
  startingBid: BigNumber;
  endingBid: BigNumber;
  setIsFairLaunch: React.Dispatch<React.SetStateAction<boolean>>;
}

enum ClaimTier {
  FIRST = 1,
  SECOND = 11,
  THIRD = 12,
}

enum NftMinted {
  GENESIS = "Genesis Parcel",
  FOUNDER = "Founder Parcels",
  EXPLORER = "Explorer Parcels",
}

function FairLaunchHeader(props: FairLaunchHeaderProps) {
  const { auctionStart, auctionEnd, startingBid, endingBid, setIsFairLaunch } =
    props;

  const [nowMinting, setNowMinting] = useState<string>("");
  const [requiredBid, setRequiredBid] = useState<BigNumber | null>(null);
  const [parcelsClaimed, setParcelsClaimed] = useState<number | null>(null);

  const { data } = useQuery(parcelsQuery, {
    variables: {
      lastBlock: 0,
      limit: ClaimTier.THIRD,
    },
    pollInterval: 10000,
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    let timerId: NodeJS.Timer;

    if (auctionStart && auctionEnd && startingBid && endingBid) {
      timerId = setInterval(() => {
        const deltaTime = auctionEnd.toNumber() * 1000 - Date.now();

        if (deltaTime <= 0) {
          setIsFairLaunch(false);
          clearInterval(timerId);
          return;
        }

        setRequiredBid(
          calculateRequiredBid(auctionStart, auctionEnd, startingBid, endingBid)
        );
      }, 1000);
    }

    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [auctionStart, auctionEnd, startingBid, endingBid]);

  useEffect(() => {
    if (!data?.geoWebParcels) {
      return;
    }

    if (parcelsClaimed === null || parcelsClaimed < data.geoWebParcels.length) {
      const nowMinting =
        data.geoWebParcels.length < ClaimTier.FIRST
          ? NftMinted.GENESIS
          : data.geoWebParcels.length < ClaimTier.SECOND
          ? NftMinted.FOUNDER
          : NftMinted.EXPLORER;

      setNowMinting(nowMinting);
      setParcelsClaimed(data.geoWebParcels.length);
    }
  }, [data]);

  return (
    <>
      {!data || !requiredBid ? (
        <div className="d-flex justify-content-center">
          <Spinner animation="border" role="status" variant="light"></Spinner>
        </div>
      ) : (
        <OverlayTrigger
          trigger={["hover", "focus"]}
          placement="bottom"
          overlay={
            <Tooltip>
              {nowMinting === NftMinted.GENESIS ? (
                <span>
                  The first parcel claimed on the Geo Web will forever be known
                  as the Genesis Parcel. Who will claim it? Where will it be?
                  How much funding will it raise for public goods?
                  <br />
                  <br />
                  The minting address will receive a 1/1 NFT commemorating their
                  important role in Geo Web history and commitment to public
                  goods.
                </span>
              ) : nowMinting === NftMinted.FOUNDER ? (
                <span>
                  Who are the brave regens ready to lay the foundations of a new
                  shared reality? 10 Founders Parcels will be minted after the
                  Genesis Parcel. All proceeds are used to fund public goods.
                  <br />
                  <br />
                  Minting addresses will receive a 1/10 NFT commemorating their
                  important role in Geo Web history and commitment to public
                  goods.
                </span>
              ) : nowMinting === NftMinted.EXPLORER ? (
                <span>
                  Be part of the Geo Web’s founding story.
                  <br />
                  <br />
                  All parcels claimed during the Fair Launch Auction will earn
                  the minting address a commemorative Explorer Parcel NFT.
                  <br />
                  <br />
                  All proceeds are used to fund public goods.
                </span>
              ) : null}
            </Tooltip>
          }
        >
          <div>
            <div className="fs-1 text-primary text-center">
              {`${truncateEth(formatBalance(requiredBid), 4)} ${PAYMENT_TOKEN}`}
            </div>
            <div className="fs-6 text-light text-center">
              <span className="pulsate">Now Minting: {nowMinting}</span>
            </div>
          </div>
        </OverlayTrigger>
      )}
    </>
  );
}

export default FairLaunchHeader;
