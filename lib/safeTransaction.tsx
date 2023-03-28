import { ethers } from "ethers";
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

  const gasLimit = ethers.BigNumber.from("10000000");
  const estimate = await smartAccount.relayAdapter.getEstimateFee(
    NETWORK_ID,
    gasLimit
  );
  const safeTransactionData = {
    data: metaTransaction.data,
    to: metaTransaction.to,
    value: metaTransaction.value,
    baseGas: estimate.toNumber(),
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
