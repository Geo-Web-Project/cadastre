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

interface RandomProps {
  sfFramework: Framework;
  registryContract: Contracts["registryDiamondContract"];
  hasRefreshed: boolean;
  setHasRefreshed: React.Dispatch<React.SetStateAction<boolean>>;
  maxListSize: number;
  handleAction: (parcel: Parcel) => void;
}

const randomQuery = gql`
  query Random($orderBy: String, $orderDirection: String) {
    geoWebParcels(
      first: 1000
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      createdAtBlock
      bboxN
      bboxS
      bboxE
      bboxW
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

function Random(props: RandomProps) {
  const {
    sfFramework,
    registryContract,
    hasRefreshed,
    setHasRefreshed,
    maxListSize,
    handleAction,
  } = props;

  const [parcels, setParcels] = useState<Parcel[] | null>(null);
  const [orderDirection, setOrderDirection] = useState<string>("desc");

  const { data, refetch, networkStatus } = useQuery<ParcelsQuery>(randomQuery, {
    variables: {
      orderBy: "createdAtBlock",
      orderDirection: "desc",
    },
    fetchPolicy: "no-cache",
  });
  const { getBasicProfile } = useBasicProfile(registryContract);

  const getQueryVariables = () => {
    const orderByChoices = [
      "createdAtBlock",
      "id",
      "currentBid__forSalePrice",
      "currentBid__timestamp",
    ];
    const orderBy =
      orderByChoices[Math.floor(Math.random() * orderByChoices.length)];

    return { orderBy, orderDirection };
  };

  useEffect(() => {
    if (!data) {
      return;
    }

    if (data.geoWebParcels.length === 0) {
      setParcels([]);
      return;
    }

    let isMounted = true;

    const geoWebParcels = [...data.geoWebParcels];
    const _parcels: Parcel[] = [];
    const promises = [];

    for (let i = 0; i < maxListSize; i++) {
      if (geoWebParcels.length === 0) {
        break;
      }

      let status: string;
      let forSalePrice: BigNumber;

      const drawnIndex = Math.floor(Math.random() * geoWebParcels.length);
      const parcel = geoWebParcels.splice(drawnIndex, 1)[0];
      const parcelId = parcel.id;
      const createdAtBlock = parcel.createdAtBlock;
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
        .then(() => getBasicProfile(parcelId))
        .then((basicProfile) => {
          const name = basicProfile?.name
            ? basicProfile.name
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
        setParcels(_parcels);
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

    const variables = getQueryVariables();
    refetch(variables);

    setOrderDirection(orderDirection === "asc" ? "desc" : "asc");
    setParcels(null);
    setHasRefreshed(false);
  }, [hasRefreshed]);

  return (
    <ParcelTable
      parcels={parcels}
      networkStatus={networkStatus}
      handleAction={handleAction}
    />
  );
}

export default Random;
