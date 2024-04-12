import {
  NativeAssetSuperToken,
  WrapperSuperToken,
  Operation,
  Host,
} from "@superfluid-finance/sdk-core";
import { encodeFunctionData, hexToBigInt, Address } from "viem";
import { useEthersSigner, useEthersProvider } from "./ethersAdapters";
import { useSuperfluidContext } from "../context/Superfluid";
import { gdaAbi } from "../lib/abi/gda";
import {
  SUPERFLUID_HOST_ADDRESS,
  DAIX_ADDRESS,
  GDA_CONTRACT_ADDRESS,
} from "../lib/constants";

export default function useSuperfluid(accountAddress?: string) {
  const { sfFramework, nativeSuperToken, wrapperSuperToken } =
    useSuperfluidContext();
  const signer = useEthersSigner();
  const provider = useEthersProvider();

  const host = new Host(SUPERFLUID_HOST_ADDRESS);

  const getUnderlyingTokenAllowance = async (
    superToken: NativeAssetSuperToken | WrapperSuperToken
  ) => {
    if (!accountAddress) {
      throw Error("Could not find the account address");
    }

    const underlyingToken = superToken.underlyingToken;
    const underlyingTokenAllowance = await underlyingToken?.allowance({
      owner: accountAddress,
      spender: DAIX_ADDRESS,
      providerOrSigner: provider,
    });

    return underlyingTokenAllowance ?? "0";
  };

  const getFlow = async (
    superToken: NativeAssetSuperToken | WrapperSuperToken,
    sender: string,
    receiver: string
  ) => {
    const flow = await superToken.getFlow({
      sender,
      receiver,
      providerOrSigner: provider,
    });

    return flow;
  };

  const getAllowance = async (
    superToken: NativeAssetSuperToken | WrapperSuperToken,
    owner: string,
    spender: string
  ) => {
    const allowance = superToken.allowance({
      owner,
      spender,
      providerOrSigner: provider,
    });

    return allowance;
  };

  const wrap = (
    superToken: NativeAssetSuperToken | WrapperSuperToken,
    amount: bigint
  ) => {
    const op = superToken.upgrade({ amount: amount.toString() });

    return op;
  };

  const underlyingTokenApprove = async (
    superToken: NativeAssetSuperToken | WrapperSuperToken,
    amount: string
  ) => {
    const underlyingToken = superToken.underlyingToken;

    if (!underlyingToken) {
      throw Error("Underlying token was not found");
    }

    const op = underlyingToken.approve({
      receiver: superToken.address,
      amount,
    });

    await execOperation(op);
  };

  const updatePermissions = (
    superToken: NativeAssetSuperToken | WrapperSuperToken,
    flowOperator: string,
    flowRateAllowance: string
  ) => {
    const op = superToken.updateFlowOperatorPermissions({
      flowOperator,
      permissions: 7, // Create or update or delete
      flowRateAllowance,
    });

    return op;
  };

  const editFlow = (
    superToken: NativeAssetSuperToken | WrapperSuperToken,
    receiver: Address,
    oldFlowRate: string,
    newFlowRate: string
  ) => {
    if (!accountAddress) {
      throw Error("Could not find the account address");
    }

    let op: Operation;

    if (BigInt(newFlowRate) === BigInt(0)) {
      op = superToken.deleteFlow({
        sender: accountAddress,
        receiver,
      });
    } else if (BigInt(oldFlowRate) !== BigInt(0)) {
      op = superToken.updateFlow({
        sender: accountAddress,
        receiver,
        flowRate: newFlowRate,
      });
    } else {
      op = superToken.createFlow({
        sender: accountAddress,
        receiver,
        flowRate: newFlowRate,
      });
    }

    return op;
  };

  const gdaGetFlowRate = async (
    account: Address,
    superTokenAddress: Address,
    gdaPool: Address
  ) => {
    const getFlowRateData = encodeFunctionData({
      abi: gdaAbi,
      functionName: "getFlowRate",
      args: [superTokenAddress, account, gdaPool],
    });
    const res = await provider.call({
      to: GDA_CONTRACT_ADDRESS,
      data: getFlowRateData,
    });
    const flowRate = res ? hexToBigInt(res as `0x${string}`).toString() : "0";

    return flowRate;
  };

  const gdaDistributeFlow = (
    superToken: NativeAssetSuperToken | WrapperSuperToken,
    flowRate: string,
    gdaPool: Address
  ) => {
    if (!accountAddress) {
      throw Error("Could not find the account address");
    }

    if (!gdaPool) {
      throw Error("Could not find GDA pool address");
    }

    const distributeFlowData = encodeFunctionData({
      abi: gdaAbi,
      functionName: "distributeFlow",
      args: [
        superToken.address as Address,
        accountAddress as Address,
        gdaPool,
        BigInt(flowRate),
        "0x",
      ],
    });
    const op = host.callAgreement(
      GDA_CONTRACT_ADDRESS,
      distributeFlowData,
      "0x",
      {}
    );

    return op;
  };

  const batchCall = async (operations: Operation[]) => {
    if (!signer) {
      throw Error("No signer was found");
    }

    if (!sfFramework) {
      throw Error("SF Framework was not found");
    }

    const batch = sfFramework.batchCall(operations);
    const tx = await batch.exec(signer);

    await tx.wait();
  };

  const execOperation = async (op: Operation) => {
    if (!signer) {
      throw Error("No signer was found");
    }

    const tx = await op.exec(signer);

    await tx.wait();
  };

  return {
    sfFramework,
    nativeSuperToken,
    wrapperSuperToken,
    getUnderlyingTokenAllowance,
    getFlow,
    getAllowance,
    wrap,
    underlyingTokenApprove,
    updatePermissions,
    editFlow,
    batchCall,
    execOperation,
    gdaGetFlowRate,
    gdaDistributeFlow,
  };
}
