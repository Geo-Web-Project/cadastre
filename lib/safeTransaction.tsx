import { ethers, BigNumber } from "ethers";
import {
  MetaTransactionData,
  OperationType,
} from "@safe-global/safe-core-sdk-types";
import { SmartAccount } from "../pages/index";
import { getSigner } from "./getSigner";
import { NETWORK_ID } from "./constants";

export async function getEncodedSafeTransaction(
  smartAccount: SmartAccount,
  metaTransaction: MetaTransactionData
): Promise<string> {
  if (!smartAccount.safe || !smartAccount?.safeAddress) {
    throw new Error("Safe is uninitialized");
  }

  const gasLimit = BigNumber.from("10000000");
  const estimate = await smartAccount.relayAdapter.getEstimateFee(
    NETWORK_ID,
    gasLimit
  );
  const safeTransactionData = {
    data: metaTransaction.data,
    to: metaTransaction.to,
    value: metaTransaction.value,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    baseGas: estimate.toString() as any, // Typed as a number but it could overflow
    gasPrice: 1,
    refundReceiver: smartAccount.relayAdapter.getFeeCollector(),
    operation: metaTransaction.operation ?? OperationType.Call,
  };
  const safeTransaction = await smartAccount.safe.createTransaction({
    safeTransactionData,
  });
  const signedSafeTransaction = await smartAccount.safe.signTransaction(
    safeTransaction
  );
  const contract = new ethers.Contract(
    smartAccount.safeAddress,
    [
      "function execTransaction(address, uint256, bytes, uint8, uint256, uint256, uint256, address, address, bytes)",
    ],
    getSigner(smartAccount.safeAuthKit)
  );
  const encodedTransaction = await contract.populateTransaction.execTransaction(
    signedSafeTransaction.data.to,
    signedSafeTransaction.data.value,
    signedSafeTransaction.data.data,
    signedSafeTransaction.data.operation,
    signedSafeTransaction.data.safeTxGas,
    signedSafeTransaction.data.baseGas,
    signedSafeTransaction.data.gasPrice,
    signedSafeTransaction.data.gasToken,
    signedSafeTransaction.data.refundReceiver,
    signedSafeTransaction.encodedSignatures()
  );

  return encodedTransaction.data ?? "0x";
}

function encodeMultiSendData(txs: MetaTransactionData[]): string {
  return "0x" + txs.map((tx) => encodeMetaTransaction(tx)).join("");
}

function encodeMetaTransaction(tx: MetaTransactionData): string {
  const encoded = ethers.utils.solidityPack(
    ["uint8", "address", "uint256", "uint256", "bytes"],
    [
      tx.operation || OperationType.Call,
      tx.to,
      tx.value,
      ethers.utils.hexDataLength(tx.data),
      tx.data,
    ]
  );

  return encoded.slice(2);
}

export function getMultiSendTransactionData(
  smartAccount: SmartAccount,
  metaTransactions: MetaTransactionData[]
): MetaTransactionData {
  if (!smartAccount?.safe || !smartAccount?.safeAddress) {
    throw new Error("Safe is uninitialized");
  }

  const multiSendContract =
    smartAccount.safe.getContractManager().multiSendCallOnlyContract;
  const multiSendData = encodeMultiSendData(metaTransactions);

  return {
    data: multiSendContract.encode("multiSend", [multiSendData]),
    to: smartAccount.safe.getMultiSendCallOnlyAddress(),
    value: "0",
    operation: OperationType.DelegateCall,
  };
}

export async function waitRelayedTxConfirmation(
  smartAccount: SmartAccount,
  provider: ethers.providers.Provider,
  taskId: string
) {
  /* eslint no-constant-condition: ["error", { "checkLoops": false }] */
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 4000));

    const res = await fetch(
      `https://relay.gelato.digital/tasks/status/${taskId}`
    );
    if (res.ok) {
      const { task } = await res.json();

      if (
        task.taskState === "ExecSuccess" ||
        task.taskState === "WaitingForConfirmation"
      ) {
        const receipt = await provider.waitForTransaction(task.transactionHash);

        return receipt;
      } else if (
        task.taskState === "Cancelled" ||
        task.taskState === "ExecReverted"
      ) {
        throw new Error(task.lastCheckMessage);
      }
    } else {
      throw new Error(`Network Error: ${res.status}`);
    }
  }
}
