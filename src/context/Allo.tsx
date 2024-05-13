import { useEffect, useState, createContext, useContext } from "react";
import { Address } from "viem";
import { usePublicClient } from "wagmi";
import { optimism, optimismSepolia } from "wagmi/chains";
import { SQFSuperFluidStrategy } from "@allo-team/allo-v2-sdk/";
import { createVerifiedFetch } from "@helia/verified-fetch";
import { recipientIds } from "../lib/governance/recipientIds";
import { sqfStrategyAbi } from "../lib/abi/sqfStrategy";
import {
  RPC_URLS_HTTP,
  SQF_STRATEGY_ADDRESS,
  ALLO_POOL_ID,
  IPFS_GATEWAYS,
} from "../lib/constants";

export type Recipient = {
  useRegistryAnchor: boolean;
  recipientAddress: Address;
  superApp: Address;
  id: Address;
  recipientStatus: Status;
  metadata: Metadata;
};

export type Metadata = {
  protocol: bigint;
  pointer: string;
};

export type RecipientDetails = {
  name: string;
  description: string;
  image: string;
  website: string;
  social: string;
};

export enum Status {
  None,
  Pending,
  Accepted,
  Rejected,
  Appealed,
  InReview,
  Canceled,
}

type PassportDecoder = {
  minPassportScore: bigint;
  address: Address;
};

export const AlloContext = createContext<{
  alloStrategy: SQFSuperFluidStrategy;
  recipients: Recipient[] | null;
  recipientsDetails: RecipientDetails[] | null;
  passportDecoder: PassportDecoder | null;
  gdaPool: Address | null;
} | null>(null);

export function useAlloContext() {
  const context = useContext(AlloContext);

  if (!context) {
    throw Error("Allo context was not found");
  }

  return context;
}

export function AlloContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [recipients, setRecipients] = useState<Recipient[] | null>(null);
  const [recipientsDetails, setRecipientsDetails] = useState<
    RecipientDetails[] | null
  >(null);
  const [passportDecoder, setPassportDecoder] =
    useState<PassportDecoder | null>(null);
  const [gdaPool, setGdaPool] = useState<Address | null>(null);

  const publicClient = usePublicClient();
  const chainId =
    import.meta.env.MODE === "mainnet" ? optimism.id : optimismSepolia.id;

  const alloStrategy = new SQFSuperFluidStrategy({
    chain: chainId,
    rpc: RPC_URLS_HTTP[chainId],
    address: SQF_STRATEGY_ADDRESS,
    poolId: ALLO_POOL_ID,
  });

  useEffect(() => {
    (async () => {
      const res = await publicClient.multicall({
        contracts: recipientIds.map((recipientId) => {
          return {
            address: SQF_STRATEGY_ADDRESS,
            abi: sqfStrategyAbi,
            functionName: "getRecipient",
            args: [recipientId],
          };
        }),
      });

      if (res.every((elem) => elem.status !== "success")) {
        throw Error("Recipients not found");
      }

      const recipients = res.map((elem, i) => {
        return { ...elem.result, id: recipientIds[i] };
      });

      shuffle(recipients as Recipient[]);

      const recipientsDetails = [];
      const emptyRecipientDetails = {
        name: "",
        description: "",
        image: "",
        website: "",
        social: "",
      };

      for (const recipient of recipients) {
        const pointer = recipient?.metadata?.pointer;

        if (pointer) {
          try {
            const verifiedFetch = await createVerifiedFetch({
              gateways: IPFS_GATEWAYS,
            });
            const detailsRes = await verifiedFetch(pointer);

            const { name, description, image, website, social } =
              await detailsRes.json();

            const imageRes = await verifiedFetch(image);
            const imageBlob = await imageRes.blob();

            recipientsDetails.push({
              name,
              description,
              image: URL.createObjectURL(imageBlob),
              website,
              social,
            });
          } catch (err) {
            recipientsDetails.push(emptyRecipientDetails);
            console.error(err);
          }
        } else {
          recipientsDetails.push(emptyRecipientDetails);
        }
      }

      setRecipients(recipients as Recipient[]);
      setRecipientsDetails(recipientsDetails);
      setPassportDecoder({
        minPassportScore: (await alloStrategy.getMinPassportScore()) as bigint,
        address: await alloStrategy.getPassportDecoder(),
      });
      setGdaPool(await alloStrategy.getGdaPool());
    })();
  }, []);

  const shuffle = (recipients: Recipient[]) => {
    for (let i = recipients.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [recipients[i], recipients[j]] = [recipients[j], recipients[i]];
    }
  };

  return (
    <AlloContext.Provider
      value={{
        alloStrategy,
        recipients,
        recipientsDetails,
        passportDecoder,
        gdaPool,
      }}
    >
      {children}
    </AlloContext.Provider>
  );
}
