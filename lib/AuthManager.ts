import { Cacao, SiweMessage } from "ceramic-cacao";
import axios, { AxiosError } from "axios";
import { STORAGE_WORKER_ENDPOINT } from "./constants";
import { encodeRpcMessage } from "@ceramicnetwork/blockchain-utils-linking";
import { Ed25519Provider } from "key-did-provider-ed25519";
import { DID } from "dids";
import { getResolver as getKeyResolver } from "key-did-resolver";
import secureRandom from "secure-random";
import { AccountId } from "caip";

export class AuthManager {
  estuaryToken?: string;

  constructor(private accountId: AccountId, private provider: any) {}

  async authenticate(): Promise<DID> {
    const sessionSeed: Uint8Array = this.getOrSetSessionSeed();
    const didProvider = new Ed25519Provider(sessionSeed);

    const didKey = new DID({
      provider: didProvider,
      resolver: {
        ...getKeyResolver(),
      },
      parent: `did:pkh:${this.accountId.toString()}`,
    });
    await didKey.authenticate();

    // Check or request capability from user
    const cacao = await this.getOrSetCacao(didKey);

    const didKeyWithCap = didKey.withCapability(cacao);
    await didKeyWithCap.authenticate();

    const existingToken = localStorage.getItem("estuaryToken");

    if (!existingToken) {
      await this.refreshToken(cacao);
    }

    return didKeyWithCap;
  }

  private async refreshToken(cacao: Cacao) {
    try {
      const message = SiweMessage.fromCacao(cacao);
      const tokenResult = await axios.post(
        `${STORAGE_WORKER_ENDPOINT}/estuary/token`,
        { siwe: message },
        { headers: { "Content-Type": "application/json" } }
      );

      this.estuaryToken = tokenResult.data.token;
      localStorage.setItem("estuaryToken", tokenResult.data.token);
    } catch (err: unknown | AxiosError) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 422) {
          // Reset session if nonce is invalid
          AuthManager.clearCacaoSession();
          await this.authenticate();
        }
      }
    }
  }

  private getOrSetSessionSeed(): Uint8Array {
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

  private async getOrSetCacao(didKey: DID) {
    const cacaoRaw = localStorage.getItem("cacao");
    let cacao = cacaoRaw
      ? (JSON.parse(cacaoRaw) as Cacao)
      : await this.createCapability(didKey);

    const exp = cacao.p.exp ? new Date(cacao.p.exp) : null;
    if (
      cacao.p.iss.replace("did:pkh:", "") !== this.accountId.toString() ||
      !exp ||
      new Date() >= exp
    ) {
      console.debug("Resetting cacao session...");
      AuthManager.clearCacaoSession();
      this.getOrSetSessionSeed();
      cacao = await this.createCapability(didKey);
      await this.refreshToken(cacao);
    }
    localStorage.setItem("cacao", JSON.stringify(cacao));

    return cacao;
  }

  static clearCacaoSession() {
    localStorage.setItem("cacao", "");
    localStorage.setItem("sessionSeed", "");
    localStorage.setItem("estuaryToken", "");
  }

  private async createCapability(didKey: DID) {
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
      address: this.accountId.address,
      statement: "Give this application access to your Geo Web data on Ceramic",
      uri: didKey.id,
      version: "1",
      nonce: nonce,
      issuedAt: now.toISOString(),
      expirationTime: exp.toISOString(),
      chainId: this.accountId.chainId.reference,
      resources: ["ceramic://*?family=geoweb"],
    });

    const signature = await safeSend(this.provider, "personal_sign", [
      siweMessage.signMessage(),
      this.accountId.address,
    ]);
    siweMessage.signature = signature;

    const cacao = Cacao.fromSiweMessage(siweMessage);
    return cacao;
  }
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
