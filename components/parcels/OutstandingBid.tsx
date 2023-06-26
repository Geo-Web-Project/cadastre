import { useState, useEffect } from "react";
import { BigNumber } from "ethers";
import { gql, useQuery } from "@apollo/client";
import { Framework } from "@superfluid-finance/sdk-core";
import * as turf from "@turf/turf";
import { GeoWebContent } from "@geo-web/content";
import { Contracts } from "@geo-web/sdk/dist/contract/types";
import { Parcel, ParcelsQuery } from "./ParcelList";
import ParcelTable from "./ParcelTable";
import { getParcelContent } from "../../lib/utils";

interface OutstandingBidProps {
  sfFramework: Framework;
  geoWebContent: GeoWebContent;
  registryContract: Contracts["registryDiamondContract"];
  hasRefreshed: boolean;
  setHasRefreshed: React.Dispatch<React.SetStateAction<boolean>>;
  maxListSize: number;
  handleAction: (parcel: Parcel) => void;
}

type Bid = Parcel & {
  timestamp: number;
};

const outstandingBidQuery = gql`
  query OutstandingBid($first: Int, $skip: Int) {
    geoWebParcels(
      first: $first
      orderBy: pendingBid__timestamp
      orderDirection: desc
      skip: $skip
      where: { pendingBid_: { contributionRate_gt: 0 } }
    ) {
      id
      createdAtBlock
      bboxN
      bboxS
      bboxE
      bboxW
      licenseOwner
      licenseDiamond
      pendingBid {
        forSalePrice
        timestamp
        contributionRate
      }
    }
  }
`;

function OutstandingBid(props: OutstandingBidProps) {
  const {
    geoWebContent,
    registryContract,
    hasRefreshed,
    setHasRefreshed,
    maxListSize,
    handleAction,
  } = props;

  const [parcels, setParcels] = useState<Bid[] | null>(null);
  const [timerId, setTimerId] = useState<NodeJS.Timer | null>(null);

  const { data, refetch, networkStatus } = useQuery<ParcelsQuery>(
    outstandingBidQuery,
    {
      variables: {
        first: maxListSize,
        skip: 0 * maxListSize,
      },
      notifyOnNetworkStatusChange: true,
    }
  );

  useEffect(() => {
    if (!data) {
      return;
    }

    if (data.geoWebParcels.length === 0) {
      setParcels([]);
      return;
    }

    let isMounted = true;

    const _parcels: Bid[] = [];
    const promises = [];

    for (const parcel of data.geoWebParcels) {
      let status: string;
      let forSalePrice: BigNumber;
      let timestamp: number;

      const parcelId = parcel.id;
      const createdAtBlock = parcel.createdAtBlock;
      const licenseOwner = parcel.licenseOwner;
      const pendingBid = parcel.pendingBid;

      if (pendingBid) {
        status = "Outstanding Bid";
        forSalePrice = BigNumber.from(pendingBid.forSalePrice);
        timestamp = pendingBid.timestamp;
      } else {
        continue;
      }

      const promiseChain = getParcelContent(
        registryContract.address.toLowerCase(),
        geoWebContent,
        parcelId,
        licenseOwner
      ).then((parcelContent) => {
        const name =
          parcelContent && parcelContent.name
            ? parcelContent.name
            : `Parcel ${parcelId}`;

        const poly = turf.bboxPolygon([
          parcel.bboxW,
          parcel.bboxS,
          parcel.bboxE,
          parcel.bboxN,
        ]);
        const center = turf.center(poly);

        _parcels.push({
          parcelId: parcelId,
          createdAtBlock: createdAtBlock,
          status: status,
          name: name,
          price: forSalePrice,
          timestamp: timestamp,
          center: center.geometry,
        });
      });

      promises.push(promiseChain);
    }

    Promise.all(promises).then(() => {
      if (isMounted) {
        const sorted = sortParcels(_parcels);

        setParcels(sorted);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [data]);

  useEffect(() => {
    if (!hasRefreshed) {
      return;
    }

    refetch({
      skip: 0,
    });

    setHasRefreshed(false);
  }, [hasRefreshed]);

  const sortParcels = (parcels: Bid[]): Bid[] => {
    const sorted = [...parcels].sort((a, b) => {
      let result = 0;

      result = a.timestamp > b.timestamp ? -1 : 1;

      return result;
    });

    return sorted;
  };

  return (
    <ParcelTable
      parcels={parcels}
      networkStatus={networkStatus}
      handleAction={handleAction}
    />
  );
}

export default OutstandingBid;
