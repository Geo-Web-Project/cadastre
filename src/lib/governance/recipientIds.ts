import { Address } from "viem";

/*
 * When the strategy's `useRegistryAnchor` is true the recipientId
 * is the registry anchor address of a registry profile,
 * else the recipient address.
 */
export const recipientIds: Address[] =
  import.meta.env.MODE === "mainnet"
    ? [
        "0xCD02e651ea605670CdDF166187D00376B55eEBDc",
        "0x728CfC897BF7Ad35fc461f5E063e6285B8f40626",
        "0x84c898b4ecfdE1E6914c04d0Af8a8bdA5C900F68",
        "0x16D1590f0cb87c37E752dDbcD8D71917d8A7eEFD",
        "0xf1701B621750bde3F586fE8fC8f985FadD0e4477",
        "0x362C639D7674FAF65901c5E9126772f965dcF38d",
      ]
    : [
        "0x4721449b7FCAC39F18F074e121b255b05128108B",
        "0x4268d2D61a2E0a771d64326F9aB09d64b9d6B892",
        "0xb3B03166F93aA1a12aAE68ce723A56BeC8464E3f",
        "0x0ff9d0f718AD0a67f1c89EC389677fcE816A6d2B",
        "0xe4fb9d4291dab5cb32aa308edbe6ac759431ebd6",
        "0x08de4f8561f71a5c63005d3de7e270b847c39223",
      ];
