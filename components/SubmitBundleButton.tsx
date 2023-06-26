import { useEffect, useState } from "react";
import { ethers, BigNumber } from "ethers";
import { useSigner } from "wagmi";
import Safe, { EthersAdapter } from "@safe-global/protocol-kit";
import { MetaTransactionData } from "@safe-global/safe-core-sdk-types";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import TransactionBundleDetails from "./TransactionBundleDetails";
import { OffCanvasPanelProps } from "./OffCanvasPanel";
import { useSafe } from "../lib/safe";
import { ZERO_ADDRESS } from "../lib/constants";
import { useBundleSettings } from "../lib/transactionBundleSettings";

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
  encodeFunctionData: (contentHash?: string) => string;
  callback: (
    receipt?: ethers.providers.TransactionReceipt
  ) => Promise<string | void>;
  transactionBundleFeesEstimate: BigNumber | null;
  setTransactionBundleFeesEstimate: React.Dispatch<
    React.SetStateAction<BigNumber | null>
  >;
  getContentHash?: () => Promise<string>;
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
    transactionBundleFeesEstimate,
    setTransactionBundleFeesEstimate,
    getContentHash,
  } = props;

  const [metaTransactions, setMetaTransaction] = useState<
    MetaTransactionData[]
  >([]);
  const [metaTransactionsCache, setMetaTransactionsCache] = useState<
    MetaTransactionData[]
  >([]);
  const [simulationGasUsedCache, setSimulationGasUsedCache] =
    useState<string>("");

  const { relayTransaction, simulateSafeTx, estimateTransactionBundleFees } =
    useSafe(smartAccount?.safe ?? null);
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
      if (!spender) {
        throw Error("Spender was not found");
      }

      setIsActing(true);
      setDidFail(false);

      const isSafeDeployed = await smartAccount?.safe?.isSafeDeployed();
      let encodedGwContractFunctionData;

      if (getContentHash) {
        const contentHash = await getContentHash();
        encodedGwContractFunctionData = encodeFunctionData(contentHash);
      } else {
        encodedGwContractFunctionData = encodeFunctionData();
      }

      const _metaTransactions = metaTransactions.slice(
        0,
        metaTransactions.length - 1
      );
      _metaTransactions.push({
        to: spender,
        value: "0",
        data: encodedGwContractFunctionData,
      });

      const receipt = await relayTransaction(_metaTransactions, {
        isSponsored: bundleSettings.isSponsored,
        gasToken:
          bundleSettings.isSponsored &&
          bundleSettings.noWrap &&
          requiredPayment &&
          superTokenBalance.lt(
            requiredPayment.add(transactionBundleFeesEstimate ?? 0)
          )
            ? ZERO_ADDRESS
            : bundleSettings.isSponsored &&
              (BigNumber.from(bundleSettings.wrapAmount).eq(0) ||
                superTokenBalance.gt(transactionBundleFeesEstimate ?? 0))
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
        !isReady ||
        !flowOperator ||
        !requiredFlowAmount ||
        !spender ||
        !requiredPayment ||
        !smartAccount?.safe
      ) {
        return;
      }

      const metaTransactions = [];
      let encodedGwContractFunctionData;

      if (getContentHash) {
        /* Dummy content hash for simulations */
        encodedGwContractFunctionData = encodeFunctionData(
          "0xe3010170122029f2d17be6139079dc48696d1f582a8530eb9805b561eda517e22a892c7e3f1f"
        );
      } else {
        encodedGwContractFunctionData = encodeFunctionData();
      }

      let wrap, approveSpending, approveFlow;
      const safeBalance = await smartAccount.safe.getBalance();
      const wrapAmount =
        bundleSettings.isSponsored &&
        !bundleSettings.noWrap &&
        (bundleSettings.wrapAll ||
          BigNumber.from(bundleSettings.wrapAmount).gt(safeBalance)) &&
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

      if (bundleSettings.isSponsored && wrapAmount && safeBalance.gt(0)) {
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

      if (requiredFlowAmount.gt(0)) {
        approveFlow = await sfFramework.cfaV1.updateFlowOperatorPermissions({
          flowOperator: flowOperator,
          permissions: 3, // Create or update
          flowRateAllowance: requiredFlowAmount.toString(),
          superToken: paymentToken.address,
        }).populateTransactionPromise;
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
      if (approveFlow?.to && approveFlow?.data) {
        metaTransactions.push({
          to: approveFlow.to,
          value: "0",
          data: approveFlow.data,
        });
      }
      metaTransactions.push({
        to: spender,
        value: "0",
        data: encodedGwContractFunctionData,
      });
      let simulationGasUsed;

      if (
        JSON.stringify(metaTransactions) ===
        JSON.stringify(metaTransactionsCache)
      ) {
        simulationGasUsed = simulationGasUsedCache;
      } else {
        simulationGasUsed = await simulateSafeTx(metaTransactions);
        setSimulationGasUsedCache(simulationGasUsed);
        setMetaTransactionsCache(metaTransactions);
      }

      const transactionFeesEstimate = await estimateTransactionBundleFees(
        simulationGasUsed
      );

      setTransactionBundleFeesEstimate(BigNumber.from(transactionFeesEstimate));
      setMetaTransaction(metaTransactions);
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
    metaTransactionsCache,
    simulationGasUsedCache,
  ]);

  return (
    <>
      <Button
        variant={buttonText === "Reject Bid" ? "danger" : "success"}
        className="w-100"
        onClick={() => submit()}
        disabled={isDisabled || !isReady}
      >
        {isActing ? spinner : buttonText}
      </Button>
      {smartAccount?.safe && transactionBundleFeesEstimate && (
        <TransactionBundleDetails
          smartAccount={smartAccount}
          metaTransactions={metaTransactions}
          transactionBundleFeesEstimate={transactionBundleFeesEstimate}
          requiredPayment={requiredPayment}
          requiredFlowAmount={requiredFlowAmount}
          isDisabled={!isReady || isDisabled}
          isActing={isActing}
          submit={submit}
        />
      )}
    </>
  );
}

export default SubmitBundleButton;
