import * as React from "react";
import Modal from "react-bootstrap/Modal";
import { ethers } from "ethers";
import { NETWORK_ID, PAYMENT_TOKEN } from "../../lib/constants";
import { getETHBalance } from "../../lib/getBalance";
import { truncateEth } from "../../lib/truncate";
import { sfSubgraph } from "../../redux/store";
import { FlowingBalance } from "../profile/FlowingBalance";
import Spinner from "react-bootstrap/Spinner";
import { NativeAssetSuperToken } from "@superfluid-finance/sdk-core";
import { CopyTokenAddress, TokenOptions } from "../CopyTokenAddress";
import Button from "react-bootstrap/Button";
import { SidebarProps } from "../Sidebar";
import { SmartAccount } from "../../pages/index";

type WrapModalProps = SidebarProps & {
  account: string;
  smartAccount: SmartAccount | null;
  show: boolean;
  handleClose: () => void;
  paymentToken: NativeAssetSuperToken;
};

function WrapModal({
  account,
  smartAccount,
  signer,
  show,
  sfFramework,
  handleClose,
  paymentToken,
}: WrapModalProps) {
  const [ETHBalance, setETHBalance] = React.useState<string | undefined>();
  const [isWrapping, setIsWrapping] = React.useState<boolean>(false);
  const [amount, setAmount] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");

  const { isLoading, data } = sfSubgraph.useAccountTokenSnapshotsQuery({
    chainId: NETWORK_ID,
    filter: {
      account: account,
      token: paymentToken.address,
    },
  });

  const isOutOfBalance =
    amount !== "" && ETHBalance !== "" && Number(amount) > Number(ETHBalance);

  React.useEffect(() => {
    let isMounted = true;

    (async () => {
      if (signer && account) {
        try {
          const ethBalance = await getETHBalance(
            sfFramework.settings.provider,
            account
          );

          if (isMounted) {
            setETHBalance(ethBalance);
          }
        } catch (error) {
          console.error(error);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [signer, account]);

  const wrapETH = async (amount: string) => {
    if (!smartAccount?.safe) {
      return;
    }

    try {
      const weiAmount = ethers.utils.parseEther(amount).toString();
      const populatedTransaction = await paymentToken.upgrade({
        amount: weiAmount,
      }).populateTransactionPromise;

      if (!populatedTransaction.data || !populatedTransaction.to) {
        return;
      }

      const safeTransactionData = {
        data: populatedTransaction.data,
        to: populatedTransaction.to,
        value: weiAmount,
      };

      setIsWrapping(true);

      const safeTransaction = await smartAccount.safe.createTransaction({
        safeTransactionData,
      });
      const executeTxResponse = await smartAccount.safe.executeTransaction(
        safeTransaction
      );

      await executeTxResponse.transactionResponse?.wait();

      const ethBalance = await getETHBalance(
        sfFramework.settings.provider,
        account
      );
      // Update balances
      setETHBalance(ethBalance);
      setAmount("");
      setError("");
    } catch (err) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      if (
        (err as any)?.code !== "TRANSACTION_REPLACED" ||
        (err as any).cancelled
      ) {
        setError(
          (err as any).reason
            ? (err as any).reason
                .replace("execution reverted: ", "")
                .replace(/([^.])$/, "$1.")
            : (err as Error).message
        );
        console.error(err);
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }

    setIsWrapping(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = (e: any) => {
    e.preventDefault();

    if (Number(amount) <= Number(ETHBalance)) {
      if (!Number.isNaN(amount) && Number(amount) > 0) {
        console.log("amount is valid", amount);
        (async () => {
          await wrapETH(amount);
        })();
      }
    }
  };

  const tokenOptions: TokenOptions = React.useMemo(
    () => ({
      address: paymentToken.address,
      signer,
      symbol: "ETHx",
      decimals: 18,
      image: "",
    }),
    [paymentToken.address]
  );

  return (
    <Modal
      show={show}
      onHide={handleClose}
      centered
      contentClassName="bg-dark"
      className="wrap-modal"
    >
      <Modal.Header className="bg-dark border-0">
        <Modal.Title className="text-primary">
          Wrap ETH for Streaming
        </Modal.Title>
        <Button
          type="button"
          className="btn-close btn-close-white"
          data-dismiss="modal"
          aria-label="Close"
          onClick={handleClose}
        />
      </Modal.Header>
      <Modal.Body className="bg-dark text-light position-relative">
        <p>Current Balances</p>
        <div style={{ padding: "0 16px" }}>
          <p>ETH: {ETHBalance ? truncateEth(ETHBalance, 8) : "---"}</p>
          <p className="mb-0 me-3">
            ETHx:{" "}
            {isLoading || data == null ? (
              <Spinner animation="border" role="status"></Spinner>
            ) : (
              <FlowingBalance
                format={(x) => truncateEth(ethers.utils.formatUnits(x), 8)}
                accountTokenSnapshot={data.items[0]}
              />
            )}
          </p>
          <div
            className="position-absolute"
            style={{ bottom: "16px", right: "16px" }}
          >
            <CopyTokenAddress options={tokenOptions} />
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer
        className="bg-dark text-light"
        style={{ position: "relative" }}
      >
        <form
          className="form-inline d-flex align-items-center"
          noValidate
          onSubmit={onSubmit}
        >
          <label className="visually-hidden">Amount</label>
          <input
            required
            autoFocus
            type="text"
            className="form-control mb-2 me-sm-6 text-white"
            style={{
              backgroundColor: "#111320",
              border: "none",
              position: "absolute",
              left: "16px",
              width: "auto",
            }}
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError("");
            }}
          />
          <Button
            type="submit"
            variant={isOutOfBalance ? "info" : "primary"}
            className="btn btn-primary mb-2"
            disabled={isWrapping || isOutOfBalance}
          >
            {isWrapping
              ? "Wrapping..."
              : isOutOfBalance
              ? "Insufficient ETH"
              : `Wrap ETH to ${PAYMENT_TOKEN}`}
          </Button>
        </form>
        {error ? (
          <span className="d-inline-block w-100 px-1 me-0 text-danger">{`Error: ${error}`}</span>
        ) : !isOutOfBalance &&
          amount !== "" &&
          Number(ETHBalance) - Number(amount) < 0.001 ? (
          <span className="d-inline-block w-100 px-1 me-0 text-danger">
            Warning: Leave enough ETH for more transactions
          </span>
        ) : null}
      </Modal.Footer>
    </Modal>
  );
}

export default WrapModal;
