import { useState, useEffect } from "react";
import { BigNumber } from "ethers";
import { gql, useQuery } from "@apollo/client";
import { Framework } from "@superfluid-finance/sdk-core";
import * as turf from "@turf/turf";
import { Contracts } from "@geo-web/sdk/dist/contract/types";
import { PCOLicenseDiamondFactory } from "@geo-web/sdk/dist/contract/index";
import { Parcel, ParcelsQuery } from "./ParcelList";
import ParcelTable from "./ParcelTable";
import { SECONDS_IN_WEEK } from "../../../lib/constants";
import { useBasicProfile } from "../../../hooks/geo-web-content/basicProfile";

interface NeedsTransferProps {
  sfFramework: Framework;
  registryContract: Contracts["registryDiamondContract"];
  hasRefreshed: boolean;
  setHasRefreshed: React.Dispatch<React.SetStateAction<boolean>>;
  shouldRefetchParcelsData: boolean;
  setShouldRefetchParcelsData: React.Dispatch<React.SetStateAction<boolean>>;
  maxListSize: number;
  handleAction: (parcel: Parcel) => void;
}

type Bid = Parcel & {
  timestamp: number;
};

const needsTransferQuery = gql`
  query NeedsTransfer($skip: Int) {
    geoWebParcels(
      first: 1000
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
      licenseDiamond
      pendingBid {
        forSalePrice
        contributionRate
        timestamp
      }
    }
  }
`;

function NeedsTransfer(props: NeedsTransferProps) {
  const {
    sfFramework,
    registryContract,
    hasRefreshed,
    setHasRefreshed,
    shouldRefetchParcelsData,
    setShouldRefetchParcelsData,
    maxListSize,
    handleAction,
  } = props;

  const [parcels, setParcels] = useState<Bid[] | null>(null);
  const [timerId, setTimerId] = useState<NodeJS.Timer | null>(null);

  const { data, refetch, networkStatus } = useQuery<ParcelsQuery>(
    needsTransferQuery,
    {
      variables: {
        skip: 0 * maxListSize,
      },
      fetchPolicy: "no-cache",
    }
  );
  const { getBasicProfile } = useBasicProfile(registryContract);

  useEffect(() => {
    if (!data) {
      return;
    }

    if (data.geoWebParcels.length === 0) {
      setParcels([]);
      return;
    }

    let isMounted = true;

    (async () => {
      const _parcels: Bid[] = [];
      let promises = [];

      for (const parcel of data.geoWebParcels) {
        const pendingBid = parcel.pendingBid;

        if (!pendingBid) {
          continue;
        }

        const licenseDiamondAddress = parcel.licenseDiamond;
        const licenseDiamondContract = PCOLicenseDiamondFactory.connect(
          licenseDiamondAddress,
          sfFramework.settings.provider
        );
        const promiseChain = (async () => {
          const shouldBidPeriodEndEarly =
            await licenseDiamondContract.shouldBidPeriodEndEarly();
          const deadline = Number(pendingBid.timestamp) + SECONDS_IN_WEEK;
          const isPastDeadline = deadline * 1000 <= Date.now();

          if (isPastDeadline || shouldBidPeriodEndEarly) {
            const parcelId = parcel.id;
            const createdAtBlock = parcel.createdAtBlock;
            const forSalePrice = BigNumber.from(pendingBid.forSalePrice);
            const timestamp = pendingBid.timestamp;
            const poly = turf.bboxPolygon([
              parcel.bboxW,
              parcel.bboxS,
              parcel.bboxE,
              parcel.bboxN,
            ]);
            const center = turf.center(poly);

            _parcels.push({
              parcelId: parcelId,
              status: "Needs Transfer",
              createdAtBlock: createdAtBlock,
              name: `Parcel ${parcelId}`,
              timestamp: timestamp,
              price: forSalePrice,
              center: center.geometry,
            });
          }
        })();
        promises.push(promiseChain);
      }

      await Promise.allSettled(promises);

      const needsTransferParcels = _parcels.splice(0, maxListSize);
      promises = [];

      for (const needsTransferParcel of needsTransferParcels) {
        promises.push(
          (async () => {
            const basicProfile = await getBasicProfile(
              needsTransferParcel.parcelId
            );
            const name = basicProfile?.name
              ? basicProfile.name
              : `Parcel ${needsTransferParcel.parcelId}`;

            needsTransferParcel.name = name;
          })()
        );
      }

      await Promise.allSettled(promises);

      if (isMounted) {
        const sorted = sortParcels(needsTransferParcels);

        setParcels(sorted);
      }
    })();

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

export default NeedsTransfer;
