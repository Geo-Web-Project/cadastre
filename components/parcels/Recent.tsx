import { useState, useEffect } from "react";
import { BigNumber } from "ethers";
import { gql, useQuery } from "@apollo/client";
import { Framework } from "@superfluid-finance/sdk-core";
import * as turf from "@turf/turf";
import { GeoWebContent } from "@geo-web/content";
import { Contracts } from "@geo-web/sdk/dist/contract/types";
import { PCOLicenseDiamondFactory } from "@geo-web/sdk/dist/contract/index";
import { Parcel, ParcelsQuery } from "./ParcelList";
import ParcelTable from "./ParcelTable";
import { getParcelContent } from "../../lib/utils";
import { SECONDS_IN_WEEK } from "../../lib/constants";

interface RecentProps {
  sfFramework: Framework;
  geoWebContent: GeoWebContent;
  registryContract: Contracts["registryDiamondContract"];
  shouldRefetchParcelsData: boolean;
  setShouldRefetchParcelsData: React.Dispatch<React.SetStateAction<boolean>>;
  hasRefreshed: boolean;
  setHasRefreshed: React.Dispatch<React.SetStateAction<boolean>>;
  maxListSize: number;
  handleAction: (parcel: Parcel) => void;
}

const recentQuery = gql`
  query Recent($first: Int, $skip: Int) {
    geoWebParcels(
      first: $first
      orderBy: createdAtBlock
      orderDirection: desc
      skip: $skip
    ) {
      id
      createdAtBlock
      bboxN
      bboxS
      bboxE
      bboxW
      licenseOwner
      licenseDiamond
      currentBid {
        forSalePrice
        contributionRate
        timestamp
      }
      pendingBid {
        forSalePrice
        timestamp
        contributionRate
      }
    }
  }
`;

function Recent(props: RecentProps) {
  const {
    sfFramework,
    geoWebContent,
    registryContract,
    shouldRefetchParcelsData,
    setShouldRefetchParcelsData,
    hasRefreshed,
    setHasRefreshed,
    maxListSize,
    handleAction,
  } = props;

  const [parcels, setParcels] = useState<Parcel[] | null>(null);
  const [timerId, setTimerId] = useState<NodeJS.Timer | null>(null);

  const { data, refetch, networkStatus } = useQuery<ParcelsQuery>(recentQuery, {
    variables: {
      first: maxListSize,
      skip: 0 * maxListSize,
    },
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    if (data.geoWebParcels.length === 0) {
      setParcels([]);
      return;
    }

    let isMounted = true;

    const _parcels: Parcel[] = [];
    const promises = [];

    for (const parcel of data.geoWebParcels) {
      let status: string;
      let forSalePrice: BigNumber;

      const parcelId = parcel.id;
      const createdAtBlock = parcel.createdAtBlock;
      const licenseOwner = parcel.licenseOwner;
      const currentBid = parcel.currentBid;
      const pendingBid = parcel.pendingBid;
      const licenseDiamondAddress = parcel.licenseDiamond;
      const licenseDiamondContract = PCOLicenseDiamondFactory.connect(
        licenseDiamondAddress,
        sfFramework.settings.provider
      );

      if (!pendingBid || BigNumber.from(pendingBid.contributionRate).eq(0)) {
        status = "Valid";
        forSalePrice = BigNumber.from(currentBid.forSalePrice);
      } else if (BigNumber.from(pendingBid.contributionRate).gt(0)) {
        status = "Outstanding Bid";
        forSalePrice = BigNumber.from(pendingBid.forSalePrice);
      } else {
        continue;
      }

      const promiseChain = licenseDiamondContract
        .shouldBidPeriodEndEarly()
        .then((shouldBidPeriodEndEarly) => {
          if (pendingBid && BigNumber.from(pendingBid.contributionRate).gt(0)) {
            const deadline = Number(pendingBid.timestamp) + SECONDS_IN_WEEK;
            const isPastDeadline = deadline * 1000 <= Date.now();

            if (isPastDeadline || shouldBidPeriodEndEarly) {
              status = "Needs Transfer";
              forSalePrice = BigNumber.from(pendingBid.forSalePrice);
            }
          }
        })
        .then(() => licenseDiamondContract.isPayerBidActive())
        .then((isPayerBidActive) => {
          if (!isPayerBidActive) {
            status = "In Foreclosure";
          }
        })
        .then(() =>
          getParcelContent(
            registryContract.address.toLowerCase(),
            geoWebContent,
            parcelId,
            licenseOwner
          )
        )
        .then((parcelContent) => {
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
    if (!shouldRefetchParcelsData) {
      return;
    }

    if (timerId) {
      clearInterval(timerId);
      setTimerId(null);
      setShouldRefetchParcelsData(false);
      return;
    }

    const intervalId = setInterval(() => {
      refetch({
        skip: 0,
      });
    }, 4000);

    setParcels(null);
    setTimerId(intervalId);

    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [shouldRefetchParcelsData, data]);

  useEffect(() => {
    if (!hasRefreshed) {
      return;
    }

    refetch({
      skip: 0,
    });

    setHasRefreshed(false);
  }, [hasRefreshed]);

  const sortParcels = (parcels: Parcel[]): Parcel[] => {
    const sorted = [...parcels].sort((a, b) => {
      let result = 0;

      result = a.createdAtBlock > b.createdAtBlock ? -1 : 1;

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

export default Recent;
