import secureRandom from "secure-random";
import { DID } from "dids";
import { Cacao, SiweMessage } from "ceramic-cacao";
import { randomString } from "@stablelib/random";
import { encodeRpcMessage } from "@ceramicnetwork/blockchain-utils-linking";
import { AccountId } from "caip";

export function getOrSetSessionSeed(): Uint8Array {
  const sessionSeedRaw = localStorage.getItem("sessionSeed");
  const sessionSeed: Uint8Array = sessionSeedRaw
    ? new Uint8Array(JSON.parse(sessionSeedRaw))
    : secureRandom.randomUint8Array(32);
  if (!sessionSeedRaw) {
    console.log(sessionSeed);
    localStorage.setItem(
      "sessionSeed",
      JSON.stringify(Array.from(sessionSeed))
    );
  }

  return sessionSeed;
}

export async function getOrSetCacao(
  didKey: DID,
  accountId: AccountId,
  provider: any
) {
  const cacaoRaw = localStorage.getItem("cacao");
  const cacao = cacaoRaw
    ? JSON.parse(cacaoRaw)
    : await createCapability(didKey, accountId, provider);
  if (!cacaoRaw) {
    localStorage.setItem("cacao", JSON.stringify(cacao));
  }

  return cacao;
}

export function clearCacaoSession() {
  localStorage.setItem("cacao", "");
  localStorage.setItem("sessionSeed", "");
}

async function createCapability(
  didKey: DID,
  accountId: AccountId,
  provider: any
) {
  const domain =
    typeof window !== "undefined" ? window.location.hostname : null;
  if (!domain) throw new Error("Missing parameter 'domain'");

  const now = new Date();
  const siweMessage = new SiweMessage({
    domain: domain,
    address: accountId.address,
    statement: "Give this application access to your Geo Web data on Ceramic",
    uri: didKey.id,
    version: "1",
    nonce: randomString(10),
    issuedAt: now.toISOString(),
    chainId: accountId.chainId.reference,
    resources: ["ceramic://*?family=geoweb"],
  });

  const signature = await safeSend(provider, "personal_sign", [
    siweMessage.signMessage(),
    accountId.address,
  ]);
  siweMessage.signature = signature;

  const cacao = Cacao.fromSiweMessage(siweMessage);
  return cacao;
}

// From EthereumAuthProvider
function safeSend(
  provider: any,
  method: string,
  params?: Array<any>
): Promise<any> {
  if (params == null) {
    params = [];
  }

  if (provider.request) {
    return provider.request({ method, params }).then(
      (response: any) => response,
      (error: any) => {
        throw error;
      }
    );
  } else if (provider.sendAsync || provider.send) {
    const sendFunc = (
      provider.sendAsync ? provider.sendAsync : provider.send
    ).bind(provider);
    const request = encodeRpcMessage(method, params);
    return new Promise((resolve, reject) => {
      sendFunc(request, (error: any, response: any) => {
        if (error) reject(error);

        if (response.error) {
          const error = new Error(response.error.message);
          (<any>error).code = response.error.code;
          (<any>error).data = response.error.data;
          reject(error);
        }

        resolve(response.result);
      });
    });
  } else {
    throw new Error(
      `Unsupported provider; provider must implement one of the following methods: send, sendAsync, request`
    );
  }
}
