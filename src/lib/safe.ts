import { BigNumber, Contract } from "ethers";
import { providers } from "ethers/lib";
import {
  Interface,
  solidityPack,
  hexDataLength,
  serializeTransaction,
  defaultAbiCoder,
} from "ethers/lib/utils";
import Safe from "@safe-global/protocol-kit";
import {
  MetaTransactionData,
  SafeTransaction,
} from "@safe-global/safe-core-sdk-types";
import {
  getProxyFactoryDeployment,
  getSafeL2SingletonDeployment,
  getMultiSendCallOnlyDeployment,
  getCompatibilityFallbackHandlerDeployment,
  getSimulateTxAccessorDeployment,
} from "@safe-global/safe-deployments";
import { GelatoRelayPack } from "@safe-global/relay-kit";
import { useAccount } from "wagmi";
import { useMediaQuery } from "./mediaQuery";
import {
  NETWORK_ID,
  RPC_URLS_HTTP,
  GW_SAFE_SALT_NONCE,
  GELATO_RELAY_API_KEY,
  REFUND_RECEIVER,
  ZERO_ADDRESS,
} from "./constants";

const MAX_GAS_LIMIT = "15000000";

enum OperationType {
  Call,
  DelegateCall,
}

function useSafe(safe: Safe | null) {
  const { connector } = useAccount();
  const { isMobile, isTablet } = useMediaQuery();

  const safeL2SingletonInfo = getSafeL2SingletonDeployment();
  const proxyFactoryInfo = getProxyFactoryDeployment();
  const multiSendCallOnlyInfo = getMultiSendCallOnlyDeployment();
  const simulateTxAccessorInfo = getSimulateTxAccessorDeployment();

  if (!safeL2SingletonInfo) {
    throw new Error("Safe singleton was not found");
  }

  if (!proxyFactoryInfo) {
    throw new Error("Safe proxy factory was not found");
  }

  if (!multiSendCallOnlyInfo) {
    throw new Error("MultiSend was not found");
  }

  if (!simulateTxAccessorInfo) {
    throw new Error("SimulateTxAccessor was not found");
  }

  const safeL2Singleton = new Interface(safeL2SingletonInfo.abi);
  const proxyFactoryInterface = new Interface(proxyFactoryInfo.abi);
  const multiSendCallOnlyInterface = new Interface(multiSendCallOnlyInfo.abi);
  const simulateTxAccessorInterface = new Interface(simulateTxAccessorInfo.abi);
  const relayKit = new GelatoRelayPack(GELATO_RELAY_API_KEY);
  const provider = new providers.JsonRpcProvider(
    RPC_URLS_HTTP[NETWORK_ID],
    NETWORK_ID
  );

  const deploySafe = async (options: { isRefunded: boolean }) => {
    if (!safe) {
      throw new Error("Safe was not found");
    }

    let safeRefundTransaction;
    const { isRefunded } = options;
    const safeAddress = await safe.getAddress();
    const safeDeploymentData = await encodeSafeDeploymentData();
    const { gasEstimate, transactionFeesEstimate } = await calcDeploymentFees();
    const metaTxs = [];
    const safeDeploymentTransaction = {
      to: proxyFactoryInfo.networkAddresses[NETWORK_ID],
      value: "0",
      data: safeDeploymentData,
    };
    metaTxs.push(safeDeploymentTransaction);

    if (isRefunded) {
      const encodedExecTransactionData = await encodeExecTransactionData(
        {
          to: REFUND_RECEIVER,
          // Add relaying transaction cost to the estimate
          value: transactionFeesEstimate.mul(150).div(100),
          data: "0x",
        },
        { gasLimit: BigNumber.from(0), isAutoRefunded: false }
      );
      safeRefundTransaction = {
        to: safeAddress,
        data: encodedExecTransactionData,
        value: "0",
      };
      metaTxs.push(safeRefundTransaction);
    }

    const multiSendData = encodeMultiSendData(metaTxs);
    const encodedTransactionData =
      multiSendCallOnlyInterface.encodeFunctionData("multiSend", [
        multiSendData,
      ]);
    const res = await relayKit.relayTransaction({
      target: multiSendCallOnlyInfo.networkAddresses[NETWORK_ID],
      encodedTransaction: encodedTransactionData,
      chainId: NETWORK_ID,
      options: {
        gasLimit: gasEstimate,
        isSponsored: true,
      },
    });

    const confirmations = 10;
    const receipt = await waitRelayedTxConfirmation(res.taskId, confirmations);

    return receipt;
  };

  const relayTransaction = async (
    metaTxs: MetaTransactionData[],
    options: {
      isSponsored: boolean;
      gasToken?: string;
    }
  ) => {
    if (!safe) {
      throw new Error("Safe was not found");
    }

    if (metaTxs.length === 0) {
      throw new Error("Nothing to relay");
    }

    const { isSponsored, gasToken } = options;
    const safeAddress = await safe.getAddress();
    const isSafeDeployed = await safe.isSafeDeployed();
    let encodedTransactionData = "0x";
    let gasEstimate = "0";

    if (metaTxs.length === 1) {
      const gasUsed = await simulateSafeTx(metaTxs);
      gasEstimate = gasUsed;
      encodedTransactionData = await encodeExecTransactionData(metaTxs[0], {
        gasLimit: BigNumber.from(gasUsed),
        isAutoRefunded: true,
        gasToken: gasToken ?? ZERO_ADDRESS,
        isSponsored,
      });
    } else {
      if (!isSafeDeployed) {
        const txs = [];
        const safeDeploymentData = await encodeSafeDeploymentData();
        const safeDeploymentTransaction = {
          to: proxyFactoryInfo.networkAddresses[NETWORK_ID],
          value: "0",
          data: safeDeploymentData,
        };
        txs.push(safeDeploymentTransaction);

        const safeMultiSendData = encodeMultiSendData(metaTxs);
        const safeMultiSendTransactionData =
          multiSendCallOnlyInterface.encodeFunctionData("multiSend", [
            safeMultiSendData,
          ]);
        const gasUsed = await simulateSafeTx(metaTxs);
        const safeTransactionData = await encodeExecTransactionData(
          {
            to: multiSendCallOnlyInfo.networkAddresses[NETWORK_ID],
            value: "0",
            data: safeMultiSendTransactionData,
            operation: OperationType.DelegateCall,
          },
          {
            gasLimit: BigNumber.from(gasUsed),
            isAutoRefunded: true,
            gasToken: gasToken ?? ZERO_ADDRESS,
            isSponsored: true,
          }
        );
        txs.push({
          to: safeAddress,
          data: safeTransactionData,
          value: "0",
        });

        const multiSendData = encodeMultiSendData(txs);
        const encodedTransactionData =
          multiSendCallOnlyInterface.encodeFunctionData("multiSend", [
            multiSendData,
          ]);

        const res = await relayKit.relayTransaction({
          target: multiSendCallOnlyInfo.networkAddresses[NETWORK_ID],
          encodedTransaction: encodedTransactionData,
          chainId: NETWORK_ID,
          options: {
            gasLimit: MAX_GAS_LIMIT,
            isSponsored: true,
            gasToken: ZERO_ADDRESS,
          },
        });
        const confirmations = 10;
        const receipt = await waitRelayedTxConfirmation(
          res.taskId,
          confirmations
        );

        return receipt;
      }

      const multiSendData = encodeMultiSendData(metaTxs);
      const multiSendTransactionData =
        multiSendCallOnlyInterface.encodeFunctionData("multiSend", [
          multiSendData,
        ]);
      const gasUsed = await simulateSafeTx(metaTxs);
      gasEstimate = gasUsed;
      encodedTransactionData = await encodeExecTransactionData(
        {
          to: multiSendCallOnlyInfo.networkAddresses[NETWORK_ID],
          value: "0",
          data: multiSendTransactionData,
          operation: OperationType.DelegateCall,
        },
        {
          gasLimit: BigNumber.from(gasEstimate),
          isAutoRefunded: true,
          gasToken: gasToken ?? ZERO_ADDRESS,
          isSponsored,
        }
      );
    }

    const res = await relayKit.relayTransaction({
      target: safeAddress,
      encodedTransaction: encodedTransactionData,
      chainId: NETWORK_ID,
      options: {
        gasLimit: MAX_GAS_LIMIT,
        isSponsored,
        gasToken: ZERO_ADDRESS,
      },
    });
    const receipt = await waitRelayedTxConfirmation(res.taskId);

    return receipt;
  };

  const calcDeploymentFees = async () => {
    if (!safe) {
      throw new Error("Safe was not found");
    }

    const ethAdapter = await safe.getEthAdapter();
    const { gasPrice } = await provider.getFeeData();

    if (!gasPrice) {
      throw new Error("Could not get gas price");
    }

    const safeDeploymentData = await encodeSafeDeploymentData();
    const safeDeploymentTransaction = {
      to: proxyFactoryInfo.networkAddresses[NETWORK_ID],
      value: "0",
      data: safeDeploymentData,
    };
    const multiSendData = encodeMultiSendData([safeDeploymentTransaction]);
    const encodedTransactionData =
      multiSendCallOnlyInterface.encodeFunctionData("multiSend", [
        multiSendData,
      ]);
    const gasEstimate = await ethAdapter.estimateGas({
      from: ZERO_ADDRESS,
      to: multiSendCallOnlyInfo.networkAddresses[NETWORK_ID],
      value: "0",
      data: encodedTransactionData,
    });
    const serializedTx = serializeTransaction({
      to: multiSendCallOnlyInfo.networkAddresses[NETWORK_ID],
      value: BigNumber.from(0),
      data: encodedTransactionData,
      chainId: NETWORK_ID,
    });
    const opGasOracle = new Contract(
      "0x420000000000000000000000000000000000000F",
      ["function getL1Fee(bytes) public view returns (uint256)"]
    ).connect(provider);

    const l1Fee = await opGasOracle.getL1Fee(serializedTx);
    const transactionFeesEstimate = l1Fee
      .add(gasPrice.mul(gasEstimate))
      .mul(110)
      .div(100);

    return { gasEstimate, transactionFeesEstimate };
  };

  const encodeSafeDeploymentData = async () => {
    if (!safe) {
      throw new Error("Safe was not found");
    }

    const owners = await safe.getOwners();
    const compatHandler = getCompatibilityFallbackHandlerDeployment();

    if (!compatHandler) {
      throw new Error("Compatibility handler was not found");
    }

    const setupData = safeL2Singleton.encodeFunctionData("setup", [
      owners, // owners
      BigNumber.from(1), // threshold
      ZERO_ADDRESS, // to
      "0x", // data
      compatHandler.networkAddresses[NETWORK_ID], // fallbackHandler
      ZERO_ADDRESS, // paymentToken
      BigNumber.from(0), // payment
      ZERO_ADDRESS, // refundReceiver
    ]);
    const safeDeploymentData = proxyFactoryInterface.encodeFunctionData(
      "createProxyWithNonce",
      [
        safeL2SingletonInfo.networkAddresses[NETWORK_ID],
        setupData,
        GW_SAFE_SALT_NONCE,
      ]
    );

    return safeDeploymentData;
  };

  const simulateSafeTx = async (metaTxs: MetaTransactionData[]) => {
    if (!safe) {
      throw new Error("Safe was not found");
    }

    const safeAddress = await safe.getAddress();
    const multiSendData = encodeMultiSendData(metaTxs);
    const multiSendTransactionData =
      multiSendCallOnlyInterface.encodeFunctionData("multiSend", [
        multiSendData,
      ]);
    const simulationCalldata = simulateTxAccessorInterface.encodeFunctionData(
      "simulate",
      [
        multiSendCallOnlyInfo.networkAddresses[NETWORK_ID],
        BigNumber.from(0),
        multiSendTransactionData,
        OperationType.DelegateCall,
      ]
    );

    const safeSingletonCode = await provider.getCode(
      safeL2SingletonInfo.networkAddresses[NETWORK_ID]
    );
    const stateOverride = {
      [safeAddress]: {
        code: safeSingletonCode,
      },
    };

    /*
     * Simulate a safe transaction with state override in case the safe is not
     * deployed yet. `simulateAndRevert` reverts even if successful so the data
     * we need is in the error message.
     */
    const res = await fetch(RPC_URLS_HTTP[NETWORK_ID], {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "eth_call",
        params: [
          {
            to: safeAddress,
            data: safeL2Singleton.encodeFunctionData("simulateAndRevert", [
              simulateTxAccessorInfo.networkAddresses[NETWORK_ID],
              simulationCalldata,
            ]),
          },
          "latest",
          stateOverride,
        ],
      }),
    });
    const simulationResultEncoded = (await res.json()).error.data;

    const simulationResultDecoded = defaultAbiCoder.decode(
      ["bool", "uint256", "uint256", "bool", "uint256", "bytes"],
      simulationResultEncoded
    );
    const gasUsed = simulationResultDecoded[2];

    return gasUsed;
  };

  const estimateTransactionBundleFees = async (gasUsed: string) => {
    let transactionFeesEstimate = "0";

    transactionFeesEstimate = await relayKit.getEstimateFee(
      NETWORK_ID,
      BigNumber.from(gasUsed).toString()
    );

    return transactionFeesEstimate;
  };

  const encodeExecTransactionData = async (
    metaTransactions: MetaTransactionData,
    options: {
      gasLimit: BigNumber;
      isAutoRefunded: boolean;
      gasToken?: string;
      isSponsored?: boolean;
    }
  ) => {
    if (!safe) {
      throw new Error("Safe was not found");
    }

    const { gasLimit, isAutoRefunded, gasToken, isSponsored } = options;
    const estimate = gasLimit.gt(0)
      ? await relayKit.getEstimateFee(NETWORK_ID, gasLimit.toString())
      : "0";

    const safeTransactionData = {
      data: metaTransactions.data,
      to: metaTransactions.to,
      value: metaTransactions.value,
      baseGas: !isAutoRefunded ? "0" : estimate,
      safeTxGas: gasLimit.mul(120).div(100).toString(),
      gasPrice: isAutoRefunded ? "1" : "0",
      gasToken: gasToken ?? ZERO_ADDRESS,
      refundReceiver:
        isAutoRefunded && isSponsored
          ? REFUND_RECEIVER
          : relayKit.getFeeCollector(),
      operation: metaTransactions.operation ?? OperationType.Call,
    };
    const safeTransaction = await safe.createTransaction({
      safeTransactionData,
    });
    const signedSafeTransaction = await signSafeTransaction(safeTransaction);

    const encodedTransactionData = await safeL2Singleton.encodeFunctionData(
      "execTransaction",
      [
        signedSafeTransaction.data.to,
        signedSafeTransaction.data.value,
        signedSafeTransaction.data.data,
        signedSafeTransaction.data.operation,
        signedSafeTransaction.data.safeTxGas,
        signedSafeTransaction.data.baseGas,
        signedSafeTransaction.data.gasPrice,
        signedSafeTransaction.data.gasToken,
        signedSafeTransaction.data.refundReceiver,
        signedSafeTransaction.encodedSignatures(),
      ]
    );

    return encodedTransactionData;
  };

  const signSafeTransaction = async (safeTransaction: SafeTransaction) => {
    if (!safe) {
      throw new Error("Safe was not found");
    }

    let signature;

    if (isMobile || isTablet || connector?.id === "walletConnect") {
      const txHash = await getSafeTransactionHash(safeTransaction);
      signature = await safe.signTransactionHash(txHash);
    } else {
      signature = await safe.signTypedData(safeTransaction, "v4");
    }

    safeTransaction.addSignature(signature);

    return safeTransaction;
  };

  const getSafeTransactionHash = async (safeTransaction: SafeTransaction) => {
    if (!safe) {
      throw new Error("Safe was not found");
    }

    const safeAddress = await safe.getAddress();
    const safeSingletonCode = await provider.getCode(
      safeL2SingletonInfo.networkAddresses[NETWORK_ID]
    );
    const stateOverride = {
      [safeAddress]: {
        code: safeSingletonCode,
      },
    };
    const txHash = await provider.send("eth_call", [
      {
        to: safeAddress,
        data: safeL2Singleton.encodeFunctionData("getTransactionHash", [
          safeTransaction.data.to,
          safeTransaction.data.value,
          safeTransaction.data.data,
          safeTransaction.data.operation,
          safeTransaction.data.safeTxGas,
          safeTransaction.data.baseGas,
          safeTransaction.data.gasPrice,
          safeTransaction.data.gasToken,
          safeTransaction.data.refundReceiver,
          safeTransaction.data.nonce++,
        ]),
      },
      "latest",
      stateOverride,
    ]);

    return txHash;
  };

  const encodeMultiSendData = (txs: MetaTransactionData[]) => {
    return "0x" + txs.map((tx) => encodeMetaTransaction(tx)).join("");
  };

  const encodeMetaTransaction = (tx: MetaTransactionData) => {
    const encoded = solidityPack(
      ["uint8", "address", "uint256", "uint256", "bytes"],
      [
        tx.operation || OperationType.Call,
        tx.to,
        tx.value,
        hexDataLength(tx.data),
        tx.data,
      ]
    );

    return encoded.slice(2);
  };

  const waitRelayedTxConfirmation = async (
    taskId: string,
    confirmations = 1
  ) => {
    if (!safe) {
      throw new Error("Safe was not found");
    }

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
          const receipt = await provider.waitForTransaction(
            task.transactionHash,
            confirmations
          );

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
  };

  return {
    encodeSafeDeploymentData,
    deploySafe,
    encodeMultiSendData,
    relayTransaction,
    waitRelayedTxConfirmation,
    simulateSafeTx,
    estimateTransactionBundleFees,
  };
}

export { useSafe };
