export const passportDecoderAbi = [
  {
    inputs: [{ type: "address", name: "user" }],
    name: "getScore",
    outputs: [{ type: "uint256", name: "score" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
