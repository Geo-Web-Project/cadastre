import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { Address } from "viem";
import { gql, useQuery } from "@apollo/client";
import useAllo from "./allo";
import { gdaAbi } from "../lib/abi/gda";
import {
  AllocationData,
  MatchingData,
  UserTokenSnapshots,
} from "../components/governance/StreamingQuadraticFunding";
import { DAIX_ADDRESS, GDA_CONTRACT_ADDRESS } from "../lib/constants";

type PoolMemberQueryResult = {
  account: { id: Address };
  units: `${number}`;
};

const USER_INFO_QUERY = gql`
  query UserInfoQuery($address: String, $token: String) {
    account(id: $address) {
      outflows(
        where: { token: $token }
        orderBy: updatedAtTimestamp
        orderDirection: desc
      ) {
        receiver {
          id
        }
        streamedUntilUpdatedAt
        updatedAtTimestamp
        currentFlowRate
      }
      accountTokenSnapshots {
        totalNetFlowRate
        totalDeposit
        maybeCriticalAtTimestamp
        balanceUntilUpdatedAt
        updatedAtTimestamp
        token {
          id
        }
      }
    }
  }
`;

const DIRECT_ALLOCATION_QUERY = gql`
  query DirectAllocationQueryy($superApps: [String]) {
    accounts(where: { id_in: $superApps }) {
      id
      accountTokenSnapshots {
        totalAmountStreamedOutUntilUpdatedAt
        updatedAtTimestamp
        totalOutflowRate
        activeIncomingStreamCount
      }
    }
  }
`;

const GDA_POOL_QUERY = gql`
  query GDAPoolQuery($gdaPool: String) {
    pool(id: $gdaPool) {
      flowRate
      totalAmountFlowedDistributedUntilUpdatedAt
      updatedAtTimestamp
      totalUnits
      poolMembers {
        account {
          id
        }
        units
        totalAmountClaimed
        updatedAtTimestamp
      }
      poolDistributors {
        account {
          id
        }
        flowRate
        totalAmountFlowedDistributedUntilUpdatedAt
        updatedAtTimestamp
      }
    }
  }
`;

export default function useRoundQuery(userAddress?: Address) {
  const [userAllocationData, setUserAllocationData] =
    useState<AllocationData[]>();
  const [userTokenSnapshots, setUserTokenSnapshots] =
    useState<UserTokenSnapshots>();
  const [directAllocationData, setDirectAllocationData] =
    useState<AllocationData[]>();
  const [matchingData, setMatchingData] = useState<MatchingData>();

  const { recipients, gdaPool } = useAllo();
  const superApps = recipients
    ? recipients.map((recipient) => recipient.superApp.toLowerCase())
    : [];
  const publicClient = usePublicClient();
  const { data: userInfoQueryResult, loading: userInfoLoading } = useQuery(
    USER_INFO_QUERY,
    {
      variables: {
        address: userAddress?.toLowerCase() ?? "",
        token: DAIX_ADDRESS.toLowerCase(),
      },
      pollInterval: 10000,
    }
  );
  const {
    data: directAllocationQueryResult,
    loading: directAllocationLoading,
  } = useQuery(DIRECT_ALLOCATION_QUERY, {
    variables: { superApps },
    pollInterval: 10000,
  });
  const { data: matchingPoolQueryResult, loading: matchingPoolLoading } =
    useQuery(GDA_POOL_QUERY, {
      variables: {
        gdaPool: gdaPool?.toLowerCase() ?? "",
      },
      pollInterval: 10000,
    });

  useEffect(() => {
    (async () => {
      if (
        !publicClient ||
        !recipients ||
        !gdaPool ||
        userInfoLoading ||
        directAllocationLoading ||
        matchingPoolLoading ||
        !userInfoQueryResult ||
        !directAllocationQueryResult ||
        directAllocationQueryResult?.accounts.length === 0 ||
        !matchingPoolQueryResult
      ) {
        return;
      }

      updateRoundData();
    })();
  }, [
    publicClient,
    recipients,
    userAddress,
    userInfoQueryResult,
    directAllocationQueryResult,
    matchingPoolQueryResult,
  ]);

  const updateRoundData = async () => {
    const userAllocationData = getUserAllocationData();
    const userTokenSnapshots = getUserTokenSnapshots();
    const directAllocationData = getDirectAllocationData();
    const matchingData = await getMatchingData();

    setUserAllocationData(userAllocationData);
    setUserTokenSnapshots(userTokenSnapshots);
    setDirectAllocationData(directAllocationData);
    setMatchingData(matchingData);
  };

  const getUserAllocationData = () => {
    const userAllocationData = [];

    const calcStreamedIncludingClosed = (
      outflows: {
        receiver: { id: Address };
        streamedUntilUpdatedAt: `${number}`;
      }[],
      superAppAddress: string
    ) =>
      outflows
        .filter(
          (outflow) => outflow.receiver.id === superAppAddress.toLowerCase()
        )
        .reduce(
          (acc, outflow) => acc + BigInt(outflow.streamedUntilUpdatedAt),
          BigInt(0)
        );

    if (userAddress && userInfoQueryResult.account) {
      const {
        account: { outflows },
      } = userInfoQueryResult;

      for (const superApp of superApps) {
        const index = outflows.findIndex(
          (outflow: any) => outflow.receiver.id === superApp.toLowerCase()
        );

        userAllocationData.push({
          flowRate: index >= 0 ? outflows[index].currentFlowRate : "0",
          streamedUntilUpdatedAt:
            index >= 0
              ? (calcStreamedIncludingClosed(
                  outflows,
                  superApp
                ).toString() as `${number}`)
              : "0",
          updatedAtTimestamp:
            index >= 0 ? outflows[index].updatedAtTimestamp : 0,
        });
      }
    } else {
      superApps.forEach(() =>
        userAllocationData.push({
          flowRate: "0",
          streamedUntilUpdatedAt: "0",
          updatedAtTimestamp: 0,
          accountTokenSnapshots: [],
        })
      );
    }

    return userAllocationData;
  };

  const getUserTokenSnapshots = () => {
    if (userAddress && userInfoQueryResult.account) {
      const {
        account: { accountTokenSnapshots },
      } = userInfoQueryResult;

      return accountTokenSnapshots.map(
        (snapshot: {
          totalNetFlowRate: `${number}`;
          token: { id: Address };
          balanceUntilUpdatedAt: `${number}`;
          updatedAtTimestamp: number;
        }) => {
          return {
            totalNetFlowRate: snapshot.totalNetFlowRate,
            token: snapshot.token.id,
            balanceUntilUpdatedAt: snapshot.balanceUntilUpdatedAt,
            updatedAtTimestamp: snapshot.updatedAtTimestamp,
          };
        }
      );
    }

    return [];
  };

  const getDirectAllocationData = () => {
    const directAllocationData = [];

    for (const superApp of superApps) {
      const index = directAllocationQueryResult.accounts.findIndex(
        (account: { id: string }) => account.id === superApp
      );
      const { accountTokenSnapshots } =
        directAllocationQueryResult.accounts[index];

      const superAppSnapshot = accountTokenSnapshots[0];
      const {
        totalOutflowRate,
        totalAmountStreamedOutUntilUpdatedAt,
        updatedAtTimestamp,
        activeIncomingStreamCount,
      } = superAppSnapshot;

      directAllocationData.push({
        flowRate: totalOutflowRate,
        streamedUntilUpdatedAt: totalAmountStreamedOutUntilUpdatedAt,
        updatedAtTimestamp,
        activeIncomingStreamCount,
      });
    }

    return directAllocationData;
  };

  const getMatchingData = async () => {
    if (!recipients) {
      return;
    }

    const { pool } = matchingPoolQueryResult;

    const adjustmentFlowRate = await publicClient.readContract({
      address: GDA_CONTRACT_ADDRESS,
      abi: gdaAbi,
      functionName: "getPoolAdjustmentFlowRate",
      args: [gdaPool ?? "0x"],
    });
    const adjustedFlowRate = BigInt(pool.flowRate) - adjustmentFlowRate;

    const matchingData: MatchingData = {
      totalUnits: pool.totalUnits,
      flowRate: adjustedFlowRate.toString() as `${number}`,
      totalAmountFlowedDistributedUntilUpdatedAt:
        pool.totalAmountFlowedDistributedUntilUpdatedAt,
      updatedAtTimestamp: pool.updatedAtTimestamp,
      members: [],
      poolDistributors: pool.poolDistributors,
    };

    for (const recipient of recipients) {
      const index = pool.poolMembers.findIndex(
        (member: PoolMemberQueryResult) =>
          member.account.id === recipient.recipientAddress.toLowerCase()
      );
      const memberUnits = pool.poolMembers[index].units;
      const memberFlowRate =
        (BigInt(memberUnits) * adjustedFlowRate) / BigInt(pool.totalUnits);

      matchingData.members.push({
        flowRate: memberFlowRate.toString() as `${number}`,
        units: memberUnits,
        totalAmountClaimed: pool.poolMembers[index].totalAmountClaimed,
        updatedAtTimestamp: pool.poolMembers[index].updatedAtTimestamp,
      });
    }

    return matchingData;
  };

  return {
    userAllocationData,
    userTokenSnapshots,
    directAllocationData,
    matchingData,
  };
}
