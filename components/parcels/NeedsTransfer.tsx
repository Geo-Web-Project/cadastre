import { useState, useEffect } from "react";
import { BigNumber } from "ethers";
import { gql, useQuery } from "@apollo/client";
import { Container } from "react-bootstrap";
import { Framework } from "@superfluid-finance/sdk-core";
import type { Point } from "@turf/turf";
import * as turf from "@turf/turf";
import { GeoWebContent } from "@geo-web/content";
import { Contracts } from "@geo-web/sdk/dist/contract/types";
import { PCOLicenseDiamondFactory } from "@geo-web/sdk/dist/contract/index";
import { MAX_LIST_SIZE, Parcel, ParcelsQuery } from "./ParcelList";
import ParcelTable from "./ParcelTable";
import { STATE } from "../Map";
import { getParcelContent } from "../../lib/utils";
import { SECONDS_IN_WEEK } from "../../lib/constants";

interface NeedsTransferProps {
  sfFramework: Framework;
  geoWebContent: GeoWebContent;
  registryContract: Contracts["registryDiamondContract"];
  setSelectedParcelId: React.Dispatch<React.SetStateAction<string>>;
  setInteractionState: React.Dispatch<React.SetStateAction<STATE>>;
  handleCloseModal: () => void;
  setParcelNavigationCenter: React.Dispatch<React.SetStateAction<Point | null>>;
  shouldRefetch: boolean;
  setShouldRefetch: React.Dispatch<React.SetStateAction<boolean>>;
}

type Bid = Parcel & {
  timestamp: number;
  licenseOwner: string;
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
      licenseOwner
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
    geoWebContent,
    registryContract,
    setSelectedParcelId,
    setInteractionState,
    handleCloseModal,
    setParcelNavigationCenter,
    shouldRefetch,
    setShouldRefetch,
  } = props;

  const [parcels, setParcels] = useState<Bid[] | null>(null);

  const { data, refetch, networkStatus } = useQuery<ParcelsQuery>(
    needsTransferQuery,
    {
      variables: {
        skip: 0 * MAX_LIST_SIZE,
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
      const promises = [];

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
          if (_parcels.length === MAX_LIST_SIZE) {
            return;
          }

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
            const parcelContent = await getParcelContent(
              registryContract.address.toLowerCase(),
              geoWebContent,
              parcel.id,
              parcel.licenseOwner
            );
            const name =
              parcelContent && parcelContent.name
                ? parcelContent.name
                : `Parcel ${parcel.id}`;

            _parcels.push({
              parcelId: parcelId,
              status: "Needs Transfer",
              createdAtBlock: createdAtBlock,
              name: name,
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

      if (isMounted) {
        const sorted = sortParcels(_parcels);

        setParcels(sorted);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [data]);

  useEffect(() => {
    if (!shouldRefetch) {
      return;
    }

    refetch({
      skip: 0,
    });

    setShouldRefetch(false);
  }, [shouldRefetch]);

  const sortParcels = (parcels: Bid[]): Bid[] => {
    const sorted = [...parcels].sort((a, b) => {
      let result = 0;

      result = a.timestamp > b.timestamp ? -1 : 1;

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
    <Container>
      <ParcelTable
        parcels={parcels}
        networkStatus={networkStatus}
        handleAction={handleAction}
      />
    </Container>
  );
}

export default NeedsTransfer;
