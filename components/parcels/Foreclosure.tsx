import { useState, useEffect } from "react";
import { BigNumber } from "ethers";
import { gql, useQuery } from "@apollo/client";
import { Framework } from "@superfluid-finance/sdk-core";
import type { Point } from "@turf/turf";
import * as turf from "@turf/turf";
import { GeoWebContent } from "@geo-web/content";
import { Contracts } from "@geo-web/sdk/dist/contract/types";
import { PCOLicenseDiamondFactory } from "@geo-web/sdk/dist/contract/index";
import { Parcel, ParcelsQuery } from "./ParcelList";
import ParcelTable from "./ParcelTable";
import { STATE } from "../Map";
import { getParcelContent } from "../../lib/utils";

interface ForeclosureProps {
  sfFramework: Framework;
  geoWebContent: GeoWebContent;
  registryContract: Contracts["registryDiamondContract"];
  setSelectedParcelId: React.Dispatch<React.SetStateAction<string>>;
  setInteractionState: React.Dispatch<React.SetStateAction<STATE>>;
  handleCloseModal: () => void;
  setParcelNavigationCenter: React.Dispatch<React.SetStateAction<Point | null>>;
  shouldRefetchParcelsData: boolean;
  setShouldRefetchParcelsData: React.Dispatch<React.SetStateAction<boolean>>;
  hasRefreshed: boolean;
  setHasRefreshed: React.Dispatch<React.SetStateAction<boolean>>;
  maxListSize: number;
}

type Bid = Parcel & {
  timestamp: number;
  licenseOwner: string;
};

const foreclosureQuery = gql`
  query Foreclosure($skip: Int) {
    geoWebParcels(
      first: 1000
      orderBy: currentBid__contributionRate
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
    }
  }
`;

function Foreclosure(props: ForeclosureProps) {
  const {
    sfFramework,
    geoWebContent,
    registryContract,
    setSelectedParcelId,
    setInteractionState,
    handleCloseModal,
    setParcelNavigationCenter,
    shouldRefetchParcelsData,
    setShouldRefetchParcelsData,
    hasRefreshed,
    setHasRefreshed,
    maxListSize,
  } = props;

  const [parcels, setParcels] = useState<Bid[] | null>(null);
  const [timerId, setTimerId] = useState<NodeJS.Timer | null>(null);

  const { data, refetch, networkStatus } = useQuery<ParcelsQuery>(
    foreclosureQuery,
    {
      variables: {
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

    (async () => {
      const _parcels: Bid[] = [];
      let promises = [];

      for (const parcel of data.geoWebParcels) {
        const licenseDiamondAddress = parcel.licenseDiamond;
        const licenseDiamondContract = PCOLicenseDiamondFactory.connect(
          licenseDiamondAddress,
          sfFramework.settings.provider
        );

        const promiseChain = (async () => {
          const isPayerBidActive =
            await licenseDiamondContract.isPayerBidActive();

          if (!isPayerBidActive) {
            const parcelId = parcel.id;
            const createdAtBlock = parcel.createdAtBlock;
            const currentBid = parcel.currentBid;
            const forSalePrice = BigNumber.from(currentBid.forSalePrice);
            const timestamp = currentBid.timestamp;
            const poly = turf.bboxPolygon([
              parcel.bboxW,
              parcel.bboxS,
              parcel.bboxE,
              parcel.bboxN,
            ]);
            const center = turf.center(poly);
            _parcels.push({
              parcelId: parcelId,
              status: "In Foreclosure",
              createdAtBlock: createdAtBlock,
              name: `Parcel ${parcelId}`,
              timestamp: timestamp,
              price: forSalePrice,
              center: center.geometry,
              licenseOwner: parcel.licenseOwner,
            });
          }
        })();
        promises.push(promiseChain);
      }

      await Promise.allSettled(promises);

      const foreclosedParcels = _parcels.splice(0, maxListSize);
      promises = [];

      for (const foreclosedParcel of foreclosedParcels) {
        promises.push(
          (async () => {
            const parcelContent = await getParcelContent(
              registryContract.address.toLowerCase(),
              geoWebContent,
              foreclosedParcel.parcelId,
              foreclosedParcel.licenseOwner
            );
            const name =
              parcelContent && parcelContent.name
                ? parcelContent.name
                : `Parcel ${foreclosedParcel.parcelId}`;

            foreclosedParcel.name = name;
          })()
        );
      }

      await Promise.allSettled(promises);

      if (isMounted) {
        const sorted = sortParcels(foreclosedParcels);

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

      result = a.price > b.price ? -1 : 1;

      return result;
    });

    return sorted;
  };

  const handleAction = (parcel: Parcel): void => {
    handleCloseModal();
    setInteractionState(STATE.PARCEL_SELECTED);
    setSelectedParcelId(parcel.parcelId);
    setParcelNavigationCenter(parcel.center);
  };

  return (
    <ParcelTable
      parcels={parcels}
      networkStatus={networkStatus}
      handleAction={handleAction}
    />
  );
}

export default Foreclosure;
