import { ethers } from "ethers";
import { SafeTransactionDataPartial } from "@safe-global/safe-core-sdk-types";
import { SmartAccount } from "../pages/index";
import { getSigner } from "./getSigner";

export async function getEncodedSafeTransaction(
  smartAccount: SmartAccount,
  safeTransactionData: SafeTransactionDataPartial
) {
  if (!smartAccount.safe) {
    return;
  }

  const safeTransaction = await smartAccount.safe.createTransaction({
    safeTransactionData,
  });
  const signedSafeTransaction = await smartAccount.safe.signTransaction(
    safeTransaction
  );
  const contract = new ethers.Contract(
    signedSafeTransaction.data.to,
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

  return encodedTransaction;
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
        await provider.waitForTransaction(task.transactionHash);
        break;
      } else if (
        task.taskState === "Cancelled" ||
        task.taskState === "ExecReverted"
      ) {
        throw new Error(task.lastCheckMessage);
      }
    } else {
      throw new Error(`Network Eror: ${res.status}`);
    }
  }
}
