import * as React from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { ethers } from "ethers";
import { useAccount, useBalance } from "wagmi";
import { NETWORK_ID, PAYMENT_TOKEN } from "../../lib/constants";
import { truncateEth } from "../../lib/truncate";
import { sfSubgraph } from "../../redux/store";
import { FlowingBalance } from "../profile/FlowingBalance";
import Spinner from "react-bootstrap/Spinner";
import { NativeAssetSuperToken } from "@superfluid-finance/sdk-core";
import { CopyTokenAddress, TokenOptions } from "../CopyTokenAddress";
import Button from "react-bootstrap/Button";
import { OffCanvasPanelProps } from "../OffCanvasPanel";

type WrapModalProps = OffCanvasPanelProps & {
  account: string;
  show: boolean;
  handleClose: () => void;
  paymentToken: NativeAssetSuperToken;
};

function WrapModal({
  account,
  signer,
  show,
  handleClose,
  paymentToken,
}: WrapModalProps) {
  const [isWrapping, setIsWrapping] = React.useState<boolean>(false);
  const [amount, setAmount] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");

  const { address } = useAccount();
  const { data: ETHBalance } = useBalance({
    address,
    cacheTime: 10000,
    staleTime: 10000,
    watch: true,
  });
  const { isLoading, data } = sfSubgraph.useAccountTokenSnapshotsQuery({
    chainId: NETWORK_ID,
    filter: {
      account: account,
      token: paymentToken.address,
    },
  });

  const isOutOfBalance =
    amount !== "" && Number(amount) > Number(ETHBalance?.formatted);

  const wrapETH = async (amount: string) => {
    try {
      const txn = await paymentToken
        .upgrade({
          amount: ethers.utils.parseEther(amount).toString(),
        })
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .exec(signer!);

      setIsWrapping(true);

      await txn.wait();

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

    if (Number(amount) <= Number(ETHBalance?.formatted)) {
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
        <p className="fw-bold">Current Balances</p>
        <p>ETH: {ETHBalance ? truncateEth(ETHBalance.formatted, 8) : "---"}</p>
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
      </Modal.Body>
      <Modal.Footer className="bg-dark text-light">
        <Form
          className="d-flex justify-content-between align-items-center w-100"
          noValidate
          onSubmit={onSubmit}
        >
          <Form.Label className="visually-hidden">Amount</Form.Label>
          <Form.Control
            required
            autoFocus
            type="text"
            className="w-50 mb-2 me-sm-6 border-0 bg-black text-white"
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
        </Form>
        {error ? (
          <span className="d-inline-block w-100 px-1 me-0 text-danger">{`Error: ${error}`}</span>
        ) : !isOutOfBalance &&
          amount !== "" &&
          Number(ETHBalance?.formatted) - Number(amount) < 0.001 ? (
          <span className="d-inline-block w-100 px-1 me-0 text-danger">
            Warning: Leave enough ETH for more transactions
          </span>
        ) : null}
      </Modal.Footer>
    </Modal>
  );
}

export default WrapModal;
