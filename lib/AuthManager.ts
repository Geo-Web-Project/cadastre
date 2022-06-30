import { Cacao, SiweMessage } from "ceramic-cacao";
import axios from "axios";
import { STORAGE_WORKER_ENDPOINT } from "./constants";
import {
  EthereumAuthProvider,
  encodeRpcMessage,
} from "@ceramicnetwork/blockchain-utils-linking";
import { Ed25519Provider } from "key-did-provider-ed25519";
import { DID } from "dids";
import { getResolver as getKeyResolver } from "key-did-resolver";
import secureRandom from "secure-random";
import { AccountId } from "caip";

export class AuthManager {
  static async authenticate(address: string, provider: any): Promise<DID> {
    const sessionSeed: Uint8Array = this.getOrSetSessionSeed();

    const ethereumAuthProvider = new EthereumAuthProvider(provider, address);
    const accountId = await ethereumAuthProvider.accountId();

    const didProvider = new Ed25519Provider(sessionSeed);

    const didKey = new DID({
      provider: didProvider,
      resolver: {
        ...getKeyResolver(),
      },
      parent: `did:pkh:${accountId.toString()}`,
    });
    await didKey.authenticate();

    // Check or request capability from user
    const cacao = await this.getOrSetCacao(didKey, accountId, provider);

    const didKeyWithCap = didKey.withCapability(cacao);
    await didKeyWithCap.authenticate();

    return didKeyWithCap;
  }

  private static getOrSetSessionSeed(): Uint8Array {
    const sessionSeedRaw = localStorage.getItem("sessionSeed");
    const sessionSeed: Uint8Array = sessionSeedRaw
      ? new Uint8Array(JSON.parse(sessionSeedRaw))
      : secureRandom.randomUint8Array(32);
    if (!sessionSeedRaw) {
      localStorage.setItem(
        "sessionSeed",
        JSON.stringify(Array.from(sessionSeed))
      );
    }

    return sessionSeed;
  }

  private static async getOrSetCacao(
    didKey: DID,
    accountId: AccountId,
    provider: any
  ) {
    const cacaoRaw = localStorage.getItem("cacao");
    let cacao = cacaoRaw
      ? (JSON.parse(cacaoRaw) as Cacao)
      : await this.createCapability(didKey, accountId, provider);

    const exp = cacao.p.exp ? new Date(cacao.p.exp) : null;
    if (
      cacao.p.iss.replace("did:pkh:", "") !== accountId.toString() ||
      !exp ||
      new Date() >= exp
    ) {
      console.debug("Resetting cacao session...");
      this.clearCacaoSession();
      this.getOrSetSessionSeed();
      cacao = await this.createCapability(didKey, accountId, provider);
    }
    localStorage.setItem("cacao", JSON.stringify(cacao));

    return cacao;
  }

  private static clearCacaoSession() {
    localStorage.setItem("cacao", "");
    localStorage.setItem("sessionSeed", "");
  }

  private static async createCapability(
    didKey: DID,
    accountId: AccountId,
    provider: any
  ) {
    const domain =
      typeof window !== "undefined" ? window.location.hostname : null;
    if (!domain) throw new Error("Missing parameter 'domain'");

    const nonceResult = await axios.get(
      `${STORAGE_WORKER_ENDPOINT}/estuary/nonce`
    );
    const nonce = nonceResult.data["nonce"];

    const now = new Date();
    const exp = new Date();
    exp.setHours(exp.getHours() + 24);

    const siweMessage = new SiweMessage({
      domain: domain,
      address: accountId.address,
      statement: "Give this application access to your Geo Web data on Ceramic",
      uri: didKey.id,
      version: "1",
      nonce: nonce,
      issuedAt: now.toISOString(),
      expirationTime: exp.toISOString(),
      chainId: accountId.chainId.reference,
      resources: ["ceramic://*?family=geoweb"],
    });

    const signature = await this.safeSend(provider, "personal_sign", [
      siweMessage.signMessage(),
      accountId.address,
    ]);
    siweMessage.signature = signature;

    const cacao = Cacao.fromSiweMessage(siweMessage);
    return cacao;
  }

  // From EthereumAuthProvider
  private static safeSend(
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
}
