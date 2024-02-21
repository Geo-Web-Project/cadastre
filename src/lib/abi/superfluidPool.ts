export const superfluidPoolAbi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "memberAddr",
        type: "address",
      },
    ],
    name: "getClaimableNow",
    outputs: [
      {
        internalType: "int256",
        name: "claimableBalance",
        type: "int256",
      },
      {
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
