import { useEffect, useState } from "react";
import { ethers, BigNumber } from "ethers";
import { useSigner } from "wagmi";
import Safe, { EthersAdapter } from "@safe-global/protocol-kit";
import { MetaTransactionData } from "@safe-global/safe-core-sdk-types";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { OffCanvasPanelProps } from "./OffCanvasPanel";
import { useSafe } from "../lib/safe";
import { ZERO_ADDRESS } from "../lib/constants";
import { useBundleSettings } from "../lib/transactionsBundleSettings";

export type SubmitBundleButtonProps = OffCanvasPanelProps & {
  isDisabled: boolean;
  requiredPayment: BigNumber | null;
  superTokenBalance: BigNumber;
  requiredFlowAmount: BigNumber | null;
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
  transactionsBundleFeesEstimate: BigNumber | null;
  setTransactionsBundleFeesEstimate: React.Dispatch<
    React.SetStateAction<BigNumber | null>
  >;
};

export function SubmitBundleButton(props: SubmitBundleButtonProps) {
  const {
    isDisabled,
    paymentToken,
    smartAccount,
    setSmartAccount,
    spender,
    superTokenBalance,
    requiredPayment,
    sfFramework,
    requiredFlowAmount,
    flowOperator,
    setErrorMessage,
    isActing,
    setIsActing,
    setDidFail,
    buttonText,
    encodeFunctionData,
    callback,
    transactionsBundleFeesEstimate,
    setTransactionsBundleFeesEstimate,
  } = props;

  const [metaTransactions, setMetaTransactions] = useState<
    MetaTransactionData[]
  >([]);

  const { relayTransaction, estimateTransactionsBundleFees } = useSafe(
    smartAccount?.safe ?? null
  );
  const { data: signer } = useSigner();
  const bundleSettings = useBundleSettings();

  const isReady =
    requiredPayment && requiredFlowAmount && spender && flowOperator
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

      const isSafeDeployed = await smartAccount?.safe?.isSafeDeployed();
      const receipt = await relayTransaction(metaTransactions, {
        isSponsored: bundleSettings.isSponsored,
        gasToken:
          bundleSettings.isSponsored &&
          bundleSettings.noWrap &&
          requiredPayment &&
          superTokenBalance.lt(
            requiredPayment.add(transactionsBundleFeesEstimate ?? 0)
          )
            ? ZERO_ADDRESS
            : bundleSettings.isSponsored &&
              (BigNumber.from(bundleSettings.wrapAmount).eq(0) ||
                superTokenBalance.gt(transactionsBundleFeesEstimate ?? 0))
            ? paymentToken.address
            : ZERO_ADDRESS,
      });

      await callback(receipt);

      if (!isSafeDeployed && smartAccount) {
        const ethAdapter = signer
          ? new EthersAdapter({
              ethers,
              signerOrProvider: signer,
            })
          : null;
        if (ethAdapter) {
          setSmartAccount({
            ...smartAccount,
            safe: await Safe.create({
              ethAdapter,
              safeAddress: smartAccount.address,
            }),
          });
        }
      }

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
    let timerId: NodeJS.Timer | null = null;

    if (timerId) {
      clearInterval(timerId);
    }

    const prepareTransaction = async () => {
      if (
        isActing ||
        !flowOperator ||
        !requiredFlowAmount ||
        !spender ||
        !requiredPayment ||
        !smartAccount?.safe
      ) {
        return;
      }

      const metaTransactions = [];
      const encodedGwContractFunctionData = encodeFunctionData();

      /* Offchain content change only */
      if (!encodedGwContractFunctionData) {
        return;
      }

      let wrap, approveSpending;
      const safeBalance = await smartAccount.safe.getBalance();
      const wrapAmount =
        bundleSettings.isSponsored &&
        !bundleSettings.noWrap &&
        (bundleSettings.wrapAll ||
          BigNumber.from(bundleSettings.wrapAmount).gt(
            safeBalance
          )) &&
        safeBalance.gt(0)
          ? safeBalance.toString()
          : bundleSettings.isSponsored &&
            !bundleSettings.noWrap &&
            BigNumber.from(bundleSettings.wrapAmount).gt(0) &&
            safeBalance.gt(0)
          ? BigNumber.from(bundleSettings.wrapAmount)
              .add(requiredPayment ?? 0)
              .toString()
          : "";

      if (
        bundleSettings.isSponsored &&
        wrapAmount &&
        safeBalance.gt(0)
      ) {
        wrap = await paymentToken.upgrade({
          amount: wrapAmount,
        }).populateTransactionPromise;
      }

      const isPaymentRequired = requiredPayment.gt(0);

      if (isPaymentRequired) {
        approveSpending = await paymentToken.approve({
          amount: requiredPayment.toString(),
          receiver: spender,
        }).populateTransactionPromise;
      }

      const approveFlow = await sfFramework.cfaV1.updateFlowOperatorPermissions(
        {
          flowOperator: flowOperator,
          permissions: 3, // Create or update
          flowRateAllowance: requiredFlowAmount.toString(),
          superToken: paymentToken.address,
        }
      ).populateTransactionPromise;

      if (!approveFlow.to || !approveFlow.data) {
        throw new Error("Error populating Superfluid transaction");
      }

      if (wrap?.to && wrap?.data) {
        metaTransactions.push({
          to: wrap.to,
          value: wrapAmount,
          data: wrap.data,
        });

      }
      if (approveSpending?.to && approveSpending?.data) {
        metaTransactions.push({
          to: approveSpending.to,
          value: "0",
          data: approveSpending.data,
        });
      }
      metaTransactions.push({
        to: approveFlow.to,
        value: "0",
        data: approveFlow.data,
      });
      metaTransactions.push({
        to: spender,
        value: "0",
        data: encodedGwContractFunctionData,
      });
      const { transactionFeesEstimate } = await estimateTransactionsBundleFees(
        metaTransactions
      );

      setTransactionsBundleFeesEstimate(
        BigNumber.from(transactionFeesEstimate)
      );
      setMetaTransactions(metaTransactions);
    };

    prepareTransaction();
    timerId = setInterval(prepareTransaction, 8000);

    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [
    flowOperator,
    spender,
    requiredPayment?._hex,
    requiredFlowAmount?._hex,
    bundleSettings.isSponsored,
    bundleSettings.wrapAll,
    bundleSettings.noWrap,
    bundleSettings.wrapAmount,
    smartAccount,
    isActing,
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
