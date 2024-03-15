import { sqrtBigInt } from "../utils";

export function calcMatchingImpactEstimate({
  totalFlowRate,
  totalUnits,
  granteeUnits,
  granteeFlowRate,
  previousFlowRate,
  newFlowRate,
}: {
  totalUnits: bigint;
  totalFlowRate: bigint;
  granteeUnits: bigint;
  granteeFlowRate: bigint;
  previousFlowRate: bigint;
  newFlowRate: bigint;
}) {
  if (newFlowRate === BigInt(0)) {
    return newFlowRate;
  }

  const scaledPreviousFlowRate = previousFlowRate / BigInt(1e6);
  const scaledNewFlowRate = newFlowRate / BigInt(1e6);
  const newGranteeUnits =
    (sqrtBigInt(granteeUnits * BigInt(1e5)) -
      sqrtBigInt(BigInt(scaledPreviousFlowRate)) +
      sqrtBigInt(BigInt(scaledNewFlowRate))) **
      BigInt(2) /
    BigInt(1e5);
  const unitsDelta = newGranteeUnits - granteeUnits;
  const newPoolUnits = unitsDelta + totalUnits;
  const newGranteeFlowRate = (newGranteeUnits * totalFlowRate) / newPoolUnits;

  return newGranteeFlowRate - granteeFlowRate;
}
