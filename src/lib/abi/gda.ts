export const gdaAbi = [
  {
    inputs: [
      { internalType: "contract ISuperfluid", name: "host", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  { inputs: [], name: "AGREEMENT_BASE_ONLY_HOST", type: "error" },
  { inputs: [], name: "GDA_ADMIN_CANNOT_BE_POOL", type: "error" },
  { inputs: [], name: "GDA_DISTRIBUTE_FOR_OTHERS_NOT_ALLOWED", type: "error" },
  {
    inputs: [],
    name: "GDA_DISTRIBUTE_FROM_ANY_ADDRESS_NOT_ALLOWED",
    type: "error",
  },
  { inputs: [], name: "GDA_FLOW_DOES_NOT_EXIST", type: "error" },
  { inputs: [], name: "GDA_INSUFFICIENT_BALANCE", type: "error" },
  { inputs: [], name: "GDA_NON_CRITICAL_SENDER", type: "error" },
  { inputs: [], name: "GDA_NOT_POOL_ADMIN", type: "error" },
  { inputs: [], name: "GDA_NO_NEGATIVE_FLOW_RATE", type: "error" },
  { inputs: [], name: "GDA_NO_ZERO_ADDRESS_ADMIN", type: "error" },
  { inputs: [], name: "GDA_ONLY_SUPER_TOKEN_POOL", type: "error" },
  { inputs: [], name: "OUT_OF_GAS", type: "error" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      {
        indexed: true,
        internalType: "contract ISuperfluidPool",
        name: "pool",
        type: "address",
      },
      { indexed: true, internalType: "address", name: "from", type: "address" },
      {
        indexed: false,
        internalType: "int256",
        name: "bufferDelta",
        type: "int256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newBufferAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "totalBufferAmount",
        type: "uint256",
      },
    ],
    name: "BufferAdjusted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32",
        name: "uuid",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "address",
        name: "codeAddress",
        type: "address",
      },
    ],
    name: "CodeUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      {
        indexed: true,
        internalType: "contract ISuperfluidPool",
        name: "pool",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "distributor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        indexed: false,
        internalType: "int96",
        name: "oldFlowRate",
        type: "int96",
      },
      {
        indexed: false,
        internalType: "int96",
        name: "newDistributorToPoolFlowRate",
        type: "int96",
      },
      {
        indexed: false,
        internalType: "int96",
        name: "newTotalDistributionFlowRate",
        type: "int96",
      },
      {
        indexed: false,
        internalType: "address",
        name: "adjustmentFlowRecipient",
        type: "address",
      },
      {
        indexed: false,
        internalType: "int96",
        name: "adjustmentFlowRate",
        type: "int96",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "userData",
        type: "bytes",
      },
    ],
    name: "FlowDistributionUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint8", name: "version", type: "uint8" },
    ],
    name: "Initialized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      {
        indexed: true,
        internalType: "contract ISuperfluidPool",
        name: "pool",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "distributor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "requestedAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "actualAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "userData",
        type: "bytes",
      },
    ],
    name: "InstantDistributionUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      {
        indexed: true,
        internalType: "contract ISuperfluidPool",
        name: "pool",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      { indexed: false, internalType: "bool", name: "connected", type: "bool" },
      {
        indexed: false,
        internalType: "bytes",
        name: "userData",
        type: "bytes",
      },
    ],
    name: "PoolConnectionUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "admin",
        type: "address",
      },
      {
        indexed: false,
        internalType: "contract ISuperfluidPool",
        name: "pool",
        type: "address",
      },
    ],
    name: "PoolCreated",
    type: "event",
  },
  {
    inputs: [],
    name: "SLOTS_BITMAP_LIBRARY_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "SUPERFLUID_POOL_DEPLOYER_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "agreementType",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      {
        components: [
          { internalType: "Time", name: "_settled_at", type: "uint32" },
          { internalType: "FlowRate", name: "_flow_rate", type: "int128" },
          { internalType: "Value", name: "_settled_value", type: "int256" },
        ],
        internalType: "struct BasicParticle",
        name: "p",
        type: "tuple",
      },
      { internalType: "Time", name: "t", type: "uint32" },
    ],
    name: "appendIndexUpdateByPool",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "castrate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidPool",
        name: "pool",
        type: "address",
      },
      { internalType: "address", name: "memberAddress", type: "address" },
      { internalType: "bytes", name: "ctx", type: "bytes" },
    ],
    name: "claimAll",
    outputs: [{ internalType: "bytes", name: "newCtx", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidPool",
        name: "pool",
        type: "address",
      },
      { internalType: "bool", name: "doConnect", type: "bool" },
      { internalType: "bytes", name: "ctx", type: "bytes" },
    ],
    name: "connectPool",
    outputs: [{ internalType: "bytes", name: "newCtx", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidPool",
        name: "pool",
        type: "address",
      },
      { internalType: "bytes", name: "ctx", type: "bytes" },
    ],
    name: "connectPool",
    outputs: [{ internalType: "bytes", name: "newCtx", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      { internalType: "address", name: "admin", type: "address" },
      {
        components: [
          {
            internalType: "bool",
            name: "transferabilityForUnitsOwner",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "distributionFromAnyAddress",
            type: "bool",
          },
        ],
        internalType: "struct PoolConfig",
        name: "config",
        type: "tuple",
      },
    ],
    name: "createPool",
    outputs: [
      {
        internalType: "contract ISuperfluidPool",
        name: "pool",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidPool",
        name: "pool",
        type: "address",
      },
      { internalType: "bytes", name: "ctx", type: "bytes" },
    ],
    name: "disconnectPool",
    outputs: [{ internalType: "bytes", name: "newCtx", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      { internalType: "address", name: "from", type: "address" },
      {
        internalType: "contract ISuperfluidPool",
        name: "pool",
        type: "address",
      },
      { internalType: "uint256", name: "requestedAmount", type: "uint256" },
      { internalType: "bytes", name: "ctx", type: "bytes" },
    ],
    name: "distribute",
    outputs: [{ internalType: "bytes", name: "newCtx", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      { internalType: "address", name: "from", type: "address" },
      {
        internalType: "contract ISuperfluidPool",
        name: "pool",
        type: "address",
      },
      { internalType: "int96", name: "requestedFlowRate", type: "int96" },
      { internalType: "bytes", name: "ctx", type: "bytes" },
    ],
    name: "distributeFlow",
    outputs: [{ internalType: "bytes", name: "newCtx", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      { internalType: "address", name: "from", type: "address" },
      { internalType: "contract ISuperfluidPool", name: "to", type: "address" },
      { internalType: "uint256", name: "requestedAmount", type: "uint256" },
    ],
    name: "estimateDistributionActualAmount",
    outputs: [
      { internalType: "uint256", name: "actualAmount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      { internalType: "address", name: "from", type: "address" },
      { internalType: "contract ISuperfluidPool", name: "to", type: "address" },
      { internalType: "int96", name: "requestedFlowRate", type: "int96" },
    ],
    name: "estimateFlowDistributionActualFlowRate",
    outputs: [
      { internalType: "int96", name: "actualFlowRate", type: "int96" },
      {
        internalType: "int96",
        name: "totalDistributionFlowRate",
        type: "int96",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCodeAddress",
    outputs: [
      { internalType: "address", name: "codeAddress", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      { internalType: "address", name: "from", type: "address" },
      { internalType: "contract ISuperfluidPool", name: "to", type: "address" },
    ],
    name: "getFlowRate",
    outputs: [{ internalType: "int96", name: "", type: "int96" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      { internalType: "address", name: "account", type: "address" },
    ],
    name: "getNetFlow",
    outputs: [{ internalType: "int96", name: "netFlowRate", type: "int96" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidPool",
        name: "pool",
        type: "address",
      },
    ],
    name: "getPoolAdjustmentFlowInfo",
    outputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "bytes32", name: "flowHash", type: "bytes32" },
      { internalType: "int96", name: "flowRate", type: "int96" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "pool", type: "address" }],
    name: "getPoolAdjustmentFlowRate",
    outputs: [{ internalType: "int96", name: "", type: "int96" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IBeacon",
        name: "superfluidPoolBeacon_",
        type: "address",
      },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      { internalType: "address", name: "pool", type: "address" },
      { internalType: "address", name: "member", type: "address" },
    ],
    name: "isMemberConnected",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidPool",
        name: "pool",
        type: "address",
      },
      { internalType: "address", name: "member", type: "address" },
    ],
    name: "isMemberConnected",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "isPatricianPeriod",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      { internalType: "address", name: "account", type: "address" },
    ],
    name: "isPatricianPeriodNow",
    outputs: [
      {
        internalType: "bool",
        name: "isCurrentlyPatricianPeriod",
        type: "bool",
      },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      { internalType: "address", name: "account", type: "address" },
    ],
    name: "isPool",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidToken",
        name: "superToken",
        type: "address",
      },
      { internalType: "address", name: "claimRecipient", type: "address" },
      { internalType: "int256", name: "amount", type: "int256" },
    ],
    name: "poolSettleClaim",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "proxiableUUID",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "time", type: "uint256" },
    ],
    name: "realtimeBalanceOf",
    outputs: [
      { internalType: "int256", name: "rtb", type: "int256" },
      { internalType: "uint256", name: "buf", type: "uint256" },
      { internalType: "uint256", name: "owedBuffer", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      { internalType: "address", name: "account", type: "address" },
    ],
    name: "realtimeBalanceOfNow",
    outputs: [
      { internalType: "int256", name: "availableBalance", type: "int256" },
      { internalType: "uint256", name: "buffer", type: "uint256" },
      { internalType: "uint256", name: "owedBuffer", type: "uint256" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "time", type: "uint256" },
    ],
    name: "realtimeBalanceVectorAt",
    outputs: [
      { internalType: "int256", name: "available", type: "int256" },
      { internalType: "int256", name: "fromPools", type: "int256" },
      { internalType: "int256", name: "buffer", type: "int256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "superfluidPoolBeacon",
    outputs: [{ internalType: "contract IBeacon", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newAddress", type: "address" }],
    name: "updateCode",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ISuperfluidPool",
        name: "pool",
        type: "address",
      },
      { internalType: "address", name: "memberAddress", type: "address" },
      { internalType: "uint128", name: "newUnits", type: "uint128" },
      { internalType: "bytes", name: "ctx", type: "bytes" },
    ],
    name: "updateMemberUnits",
    outputs: [{ internalType: "bytes", name: "newCtx", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
