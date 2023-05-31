import { useEffect, useState } from "react";
import { ethers, BigNumber } from "ethers";
import { MetaTransactionData } from "@safe-global/safe-core-sdk-types";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { OffCanvasPanelProps } from "./OffCanvasPanel";
import { useSafe } from "../lib/safe";

export type SubmitBundleButtonProps = OffCanvasPanelProps & {
  isDisabled: boolean;
  requiredPayment: BigNumber | null;
  requiredFlowAmount: BigNumber | null;
  requiredFlowPermissions: number | null;
  spender: string | null;
  flowOperator: string | null;
  setErrorMessage: (v: string) => void;
  isActing: boolean;
  setIsActing: (v: boolean) => void;
  setDidFail: (v: boolean) => void;
  buttonText: string;
  encodeFunctionData: () => string | void;
  callback: (
    receipt?: ethers.providers.TransactionReceipt
  ) => Promise<string | void>;
  setTransactionBundleFeesEstimate: React.Dispatch<
    React.SetStateAction<BigNumber | null>
  >;
};

export function SubmitBundleButton(props: SubmitBundleButtonProps) {
  const {
    isDisabled,
    paymentToken,
    smartAccount,
    spender,
    requiredPayment,
    sfFramework,
    requiredFlowPermissions,
    requiredFlowAmount,
    flowOperator,
    setErrorMessage,
    isActing,
    setIsActing,
    setDidFail,
    buttonText,
    encodeFunctionData,
    callback,
    setTransactionBundleFeesEstimate,
  } = props;

  const [metaTransactions, setMetaTransactions] = useState<
    MetaTransactionData[]
  >([]);

  const { relayTransaction, estimateTransactionBundleFees } = useSafe(
    smartAccount?.safe ?? null
  );

  const isReady =
    requiredPayment &&
    requiredFlowAmount &&
    requiredFlowPermissions &&
    spender &&
    flowOperator
      ? true
      : false;

  const spinner = (
    <Spinner as="span" size="sm" animation="border" role="status">
      <span className="visually-hidden">Sending Transaction...</span>
    </Spinner>
  );

  const submit = async () => {
    try {
      setIsActing(true);
      setDidFail(false);

      const encodedGwContractFunctionData = encodeFunctionData();

      /* Offchain content change only */
      if (!encodedGwContractFunctionData) {
        await callback();
        setIsActing(false);

        return;
      }

      const receipt = await relayTransaction(
        metaTransactions,
        paymentToken.address
      );

      await callback(receipt);
      setIsActing(false);
    } catch (err) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      console.error(err);
      setErrorMessage(
        (err as any).reason
          ? (err as any).reason.replace("execution reverted: ", "")
          : (err as Error).message
      );
      setIsActing(false);
      setDidFail(true);

      return false;
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }
  };

  useEffect(() => {
    (async () => {
      if (
        !flowOperator ||
        !requiredFlowAmount ||
        !spender ||
        !requiredPayment ||
        !smartAccount?.safe ||
        !smartAccount?.address
      ) {
        return;
      }

      const yearlyFeeBufferedPayment = requiredPayment.add(requiredFlowAmount);
      const wrapAmount = yearlyFeeBufferedPayment.toString();
      const wrap = await paymentToken.upgrade({
        amount: wrapAmount,
      }).populateTransactionPromise;
      const approveSpending = await paymentToken.approve({
        amount: requiredPayment.toString(),
        receiver: spender,
      }).populateTransactionPromise;
      const approveFlow = await sfFramework.cfaV1.updateFlowOperatorPermissions(
        {
          flowOperator: flowOperator,
          permissions: 3, // Create or update
          flowRateAllowance: requiredFlowAmount.toString(),
          superToken: paymentToken.address,
        }
      ).populateTransactionPromise;

      if (
        !wrap.to ||
        !wrap.data ||
        !approveSpending.to ||
        !approveSpending.data ||
        !approveFlow.to ||
        !approveFlow.data
      ) {
        throw new Error("Error populating Superfluid transaction");
      }
      const encodedGwContractFunctionData = encodeFunctionData();

      /* Offchain content change only */
      if (!encodedGwContractFunctionData) {
        return;
      }

      const wrapTransactionData = {
        to: wrap.to,
        value: wrapAmount,
        data: wrap.data,
      };
      const approveSpendingTransactionData = {
        to: approveSpending.to,
        value: "0",
        data: approveSpending.data,
      };
      const approveFlowTransactionData = {
        to: approveFlow.to,
        value: "0",
        data: approveFlow.data,
      };
      const gwContractTransactionData = {
        to: spender,
        value: "0",
        data: encodedGwContractFunctionData,
      };
      const metaTransactions = [
        wrapTransactionData,
        approveSpendingTransactionData,
        approveFlowTransactionData,
        gwContractTransactionData,
      ];
      const { transactionFeesEstimate } = await estimateTransactionBundleFees(
        metaTransactions
      );

      setTransactionBundleFeesEstimate(BigNumber.from(transactionFeesEstimate));
      setMetaTransactions(metaTransactions);
    })();
  }, [
    flowOperator,
    requiredPayment?._hex,
    spender,
    requiredFlowAmount?._hex,
    smartAccount,
  ]);

  return (
    <Button
      variant={buttonText === "Reject Bid" ? "danger" : "success"}
      className="w-100"
      onClick={() => submit()}
      disabled={isDisabled || !isReady}
    >
      {isActing ? spinner : buttonText}
    </Button>
  );
}

export default SubmitBundleButton;
