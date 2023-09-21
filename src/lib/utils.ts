import { ethers, BigNumber } from "ethers";
import { Framework, NativeAssetSuperToken } from "@superfluid-finance/sdk-core";
import BN from "bn.js";
import { AssetId, AccountId } from "caip";
import { NETWORK_ID } from "./constants";

export function fromRateToValue(
  contributionRate: BigNumber,
  perSecondFeeNumerator: BigNumber,
  perSecondFeeDenominator: BigNumber
) {
  return contributionRate
    .mul(perSecondFeeDenominator)
    .div(perSecondFeeNumerator);
}

export function fromValueToRate(
  value: BigNumber,
  perSecondFeeNumerator: BigNumber,
  perSecondFeeDenominator: BigNumber
) {
  return value.mul(perSecondFeeNumerator).div(perSecondFeeDenominator);
}

export function calculateTimeString(remaining: number) {
  if (remaining <= 0) {
    return "0d 0h 0m 0s";
  }

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

export async function calculateBufferNeeded(
  sfFramework: Framework,
  paymentToken: NativeAssetSuperToken,
  stream: BigNumber
) {
  return await sfFramework.cfaV1.contract
    .connect(sfFramework.settings.provider)
    .getDepositRequiredForFlowRate(paymentToken.address, stream);
}

export function calculateAuctionValue(
  forSalePrice: BigNumber,
  auctionStart: BigNumber,
  auctionLength: BigNumber
) {
  const blockTimestamp = BigNumber.from(Math.floor(Date.now() / 1000));
  if (blockTimestamp.gt(auctionStart.add(auctionLength))) {
    return BigNumber.from(0);
  }

  const timeElapsed = blockTimestamp.sub(auctionStart);
  const priceDecrease = forSalePrice.mul(timeElapsed).div(auctionLength);

  return forSalePrice.sub(priceDecrease);
}

export async function getParcelContent(
  registryContractAddress: string,
  parcelId: string,
  licenseOwner: string
) {
  try {
    const assetId = new AssetId({
      chainId: `eip155:${NETWORK_ID}`,
      assetName: {
        namespace: "erc721",
        reference: registryContractAddress,
      },
      tokenId: new BN(parcelId.slice(2), "hex").toString(10),
    });
    const ownerId = new AccountId({
      chainId: `eip155:${NETWORK_ID}`,
      address: ethers.utils.getAddress(licenseOwner),
    });
    // const parcelContent = await Promise.any([
    //   geoWebContent.raw.getPath("/basicProfile", {
    //     parcelId: assetId,
    //     ownerDID: `did:pkh:${ownerId}`,
    //   }),
    //   new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
    // ]);

    return undefined as any;
  } catch (err) {
    console.error(err);
  }
}
