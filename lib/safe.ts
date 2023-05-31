import { BigNumber, Contract } from "ethers";
import {
  Interface,
  solidityPack,
  hexDataLength,
  serializeTransaction,
  defaultAbiCoder,
} from "ethers/lib/utils";
import Safe from "@safe-global/protocol-kit";
import { MetaTransactionData } from "@safe-global/safe-core-sdk-types";
import {
  getProxyFactoryDeployment,
  getSafeL2SingletonDeployment,
  getMultiSendCallOnlyDeployment,
  getCompatibilityFallbackHandlerDeployment,
  getSimulateTxAccessorDeployment,
} from "@safe-global/safe-deployments";
import { GelatoRelayPack } from "@safe-global/relay-kit";
import {
  NETWORK_ID,
  GW_SAFE_SALT_NONCE,
  GELATO_RELAY_API_KEY,
  REFUND_RECEIVER,
  ZERO_ADDRESS,
} from "./constants";

const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

enum OperationType {
  Call,
  DelegateCall,
}

enum GwFunctionSelector {
  CLAIM = "0xd27a4bd0",
  PLACE_BID = "0x00fa6802",
}

function useSafe(safe: Safe | null) {
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

  const deploySafe = async () => {
    if (!safe) {
      throw new Error("Safe was not found");
    }

    const safeAddress = await safe.getAddress();
    const safeDeploymentData = await encodeSafeDeploymentData();
    const { gasEstimate, transactionFeesEstimate } = await calcDeploymentFees();
    const safeDeploymentTransaction = {
      to: proxyFactoryInfo.networkAddresses[NETWORK_ID],
      value: "0",
      data: safeDeploymentData,
    };
    const encodedExecTransactionData = await encodeExecTransactionData(
      {
        to: REFUND_RECEIVER,
        // Add relaying transaction cost to the estimate
        value: transactionFeesEstimate.mul(150).div(100),
        data: "0x",
      },
      { gasLimit: BigNumber.from(0), isAutoRefunded: false }
    );
    const safeRefundTransaction = {
      to: safeAddress,
      data: encodedExecTransactionData,
      value: "0",
    };
    const multiSendData = encodeMultiSendData([
      safeDeploymentTransaction,
      safeRefundTransaction,
    ]);
    const encodedTransactionData =
      multiSendCallOnlyInterface.encodeFunctionData("multiSend", [
        multiSendData,
      ]);
    const res = await relayKit.relayTransaction({
      target: multiSendCallOnlyInfo.networkAddresses[NETWORK_ID],
      encodedTransaction: encodedTransactionData,
      chainId: NETWORK_ID,
      options: {
        gasLimit: (Number(gasEstimate) * 1.2).toString(),
        isSponsored: true,
      },
    });

    const receipt = await waitRelayedTxConfirmation(res.taskId);

    return receipt;
  };

  const relayTransaction = async (
    metaTxs: MetaTransactionData[],
    gasToken?: string
  ) => {
    if (!safe) {
      throw new Error("Safe was not found");
    }

    if (metaTxs.length === 0) {
      throw new Error("Nothing to relay");
    }

    const safeAddress = await safe.getAddress();
    const ethAdapter = await safe.getEthAdapter();
    const isSafeDeployed = await safe.isSafeDeployed();
    let encodedTransactionData = "0x";
    let gasEstimate = "0";

    if (metaTxs.length === 1) {
      gasEstimate = await ethAdapter.estimateGas({
        from: WETH_ADDRESS,
        to: metaTxs[0].to,
        value: metaTxs[0].value,
        data: metaTxs[0].data,
      });
      encodedTransactionData = await encodeExecTransactionData(metaTxs[0], {
        gasLimit: BigNumber.from(gasEstimate),
        isAutoRefunded: true,
        gasToken: gasToken ?? ZERO_ADDRESS,
      });
    } else {
      if (!isSafeDeployed) {
        await deploySafe();
      }

      const totalValue = metaTxs.reduce(
        (acc, curr) => acc.add(curr.value),
        BigNumber.from(0)
      );
      const multiSendData = encodeMultiSendData(metaTxs);
      const multiSendTransactionData =
        multiSendCallOnlyInterface.encodeFunctionData("multiSend", [
          multiSendData,
        ]);
      const { gasUsed } = await estimateTransactionBundleFees(metaTxs);
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
        }
      );
    }

    const res = await relayKit.relayTransaction({
      target: safeAddress,
      encodedTransaction: encodedTransactionData,
      chainId: NETWORK_ID,
      options: {
        gasLimit: gasEstimate,
        isSponsored: true,
      },
    });
    const receipt = await waitRelayedTxConfirmation(res.taskId);

    return receipt;
  };

  /*
  const calcRelayFees = async (gasLimit: BigNumber) => {
    if (!safe) {
      throw new Error("Safe was not found");
    }

    const ethAdapter = await safe.getEthAdapter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider = (ethAdapter as any).getProvider();
    const { gasPrice } = await provider.getFeeData();
    const opGasOracle = new Contract(
      "0x420000000000000000000000000000000000000F",
      [
        "function gasPrice() public view returns (uint256)",
        "function decimals() public view returns (uint256)",
        "function getL1Fee(bytes) public view returns (uint256)",
        "function overhead() public view returns (uint256)",
        "function scalar() public view returns (uint256)",
        "function l1BaseFee() public view returns (uint256)",
      ]
    ).connect(provider);

    const relayDataCost = BigNumber.from(130000);
    const relayGasCost = BigNumber.from(200000);
    const decimals = await opGasOracle.decimals();
    const l1BaseFee = await opGasOracle.l1BaseFee();
    const overhead = await opGasOracle.overhead();
    const scalar = await opGasOracle.scalar();
    const l1Fees = l1BaseFee
      .mul(relayDataCost.add(overhead))
      .mul(scalar.div(decimals));
    const l2Fees = gasLimit.add(relayGasCost).mul(gasPrice);
    const transactionFeesEstimate = l1Fees.add(l2Fees);

    return { transactionFeesEstimate };
  };
  */

  const calcDeploymentFees = async () => {
    if (!safe) {
      throw new Error("Safe was not found");
    }

    const ethAdapter = await safe.getEthAdapter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider = (ethAdapter as any).getProvider();
    const { gasPrice } = await provider.getFeeData();
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
      from: WETH_ADDRESS,
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

  const estimateTransactionBundleFees = async (
    metaTxs: MetaTransactionData[]
  ) => {
    if (!safe) {
      throw new Error("Safe was not found");
    }

    const ethAdapter = await safe.getEthAdapter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider = await (ethAdapter as any).getProvider();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safeContract = (safe as any).getContractManager().safeContract?.contract as any;
    const safeAddress = await safe.getAddress();
    const multiSendData = encodeMultiSendData(metaTxs);
    const multiSendTransactionData =
      multiSendCallOnlyInterface.encodeFunctionData("multiSend", [
        multiSendData,
      ]);
    const totalValue = metaTxs.reduce(
      (acc, curr) => acc.add(curr.value),
      BigNumber.from(0)
    );
    const simulationCalldata = simulateTxAccessorInterface.encodeFunctionData(
      "simulate",
      [
        multiSendCallOnlyInfo.networkAddresses[NETWORK_ID],
        BigNumber.from(0),
        multiSendTransactionData,
        OperationType.DelegateCall,
      ]
    );
    const simulationResultEncoded = await provider.call({
      to: safeAddress,
      data: safeContract.interface.encodeFunctionData("simulateAndRevert", [
        simulateTxAccessorInfo.networkAddresses[NETWORK_ID],
        simulationCalldata,
      ]),
    });
    const simulationResultDecoded = defaultAbiCoder.decode(
      ["bool", "uint256", "uint256", "bool", "uint256", "bytes"],
      simulationResultEncoded
    );
    const gasUsed = simulationResultDecoded[2];
    const transactionFeesEstimate = await relayKit.getEstimateFee(
      NETWORK_ID,
      BigNumber.from(gasUsed).toString()
    );

    return { transactionFeesEstimate, gasUsed };
  };

  const encodeExecTransactionData = async (
    metaTransaction: MetaTransactionData,
    options: {
      gasLimit: BigNumber;
      isAutoRefunded: boolean;
      gasToken?: string;
    }
  ) => {
    if (!safe) {
      throw new Error("Safe was not found");
    }

    const { gasLimit, isAutoRefunded, gasToken } = options;
    const estimate = await relayKit.getEstimateFee(
      NETWORK_ID,
      gasLimit.toString()
    );
    const baseGas = BigNumber.from(estimate).mul(110).div(100);

    const safeTransactionData = {
      data: metaTransaction.data,
      to: metaTransaction.to,
      value: metaTransaction.value,
      baseGas: !isAutoRefunded ? "0" : baseGas.toString(),
      safeTxGas: gasLimit.toString(),
      gasPrice: isAutoRefunded ? "1" : "0",
      gasToken: gasToken ?? ZERO_ADDRESS,
      refundReceiver: isAutoRefunded
        ? REFUND_RECEIVER
        : relayKit.getFeeCollector(),
      operation: metaTransaction.operation ?? OperationType.Call,
      nonce: await safe.getNonce(),
    };
    const safeTransaction = await safe.createTransaction({
      safeTransactionData,
    });
    const signedSafeTransaction = await safe.signTransaction(safeTransaction);
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

  const waitRelayedTxConfirmation = async (taskId: string) => {
    if (!safe) {
      throw new Error("Safe was not found");
    }

    const ethAdapter = await safe.getEthAdapter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider = (ethAdapter as any).getProvider();

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
            task.transactionHash
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
    deploySafe,
    relayTransaction,
    waitRelayedTxConfirmation,
    estimateTransactionBundleFees,
  };
}

export { useSafe };
