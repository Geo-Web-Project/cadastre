/* eslint-disable import/no-unresolved */
import * as React from "react";
import Modal from "react-bootstrap/Modal";
import { ethers } from "ethers";
import { ethxABI, NETWORK_ID } from "../../lib/constants";
import { getETHBalance } from "../../lib/getBalance";
import { sfApi } from "../../redux/store";
import { FlowingBalance } from "../profile/FlowingBalance";
import Spinner from "react-bootstrap/Spinner";

type WrapModalProps = {
  account: string;
  provider: ethers.providers.Web3Provider;
  show: boolean;
  handleClose: () => void;
  paymentTokenAddress: string;
};

function WrapModal({
  account,
  provider,
  show,
  handleClose,
  paymentTokenAddress,
}: WrapModalProps) {
  const [ETHBalance, setETHBalance] = React.useState<string | undefined>();
  const [isWrapping, setIsWrapping] = React.useState<boolean>(false);
  const [isBalanceInsufficient, setIsBalanceInsufficient] =
    React.useState<boolean>(false);

  const { isLoading, data: ethxBalance } = paymentTokenAddress
    ? sfApi.useGetRealtimeBalanceQuery(
        {
          chainId: NETWORK_ID,
          accountAddress: account,
          superTokenAddress: paymentTokenAddress,
          estimationTimestamp: undefined,
        },
        { pollingInterval: 1000 }
      )
    : { isLoading: true, data: null };

  React.useEffect(() => {
    let isMounted = true;

    (async () => {
      if (provider && account) {
        try {
          const ethBalance = await getETHBalance(provider, account);

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
  }, [provider, account]);

  const wrapETH = async (amount: string) => {
    const ETHx = new ethers.Contract(paymentTokenAddress, ethxABI, provider);

    const reciept = await ETHx.connect(provider.getSigner()).upgradeByETH({
      value: ethers.utils.parseEther(amount),
    });

    setIsWrapping(true);

    try {
      await reciept.wait();
      // Wrap ETHx successfully!
      const ethBalance = await getETHBalance(provider, account);
      // Update balances
      setETHBalance(ethBalance);
    } catch (error) {
      console.error(error);
    }

    setIsWrapping(false);
  };

  const onSubmit = (e: any) => {
    e.preventDefault();
    const amount = Number(e.target[0].value);

    if (amount > Number(ETHBalance)) {
      setIsBalanceInsufficient(true);
    } else {
      setIsBalanceInsufficient(false);

      if (!Number.isNaN(amount) && amount > 0) {
        console.log("amount is valid", amount);
        (async () => {
          await wrapETH(amount.toString());
        })();
      }
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered className="wrap-modal">
      <Modal.Header className="bg-dark border-0">
        <Modal.Title className="text-primary">
          Wrap ETH for Streaming
        </Modal.Title>
        <button
          type="button"
          className="close text-light"
          data-dismiss="modal"
          aria-label="Close"
          onClick={handleClose}
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </Modal.Header>
      <Modal.Body className="bg-dark text-light">
        <p>Current Balances</p>
        <div style={{ padding: "0 16px" }}>
          <p>ETH: {ETHBalance ?? "---"}</p>
          <p>
            ETHx:{" "}
            {isLoading || ethxBalance == null ? (
              <Spinner animation="border" role="status"></Spinner>
            ) : (
              <FlowingBalance
                format={(x) => ethers.utils.formatUnits(x)}
                balanceWei={ethxBalance.availableBalanceWei}
                flowRateWei={ethxBalance.netFlowRateWei}
                balanceTimestamp={ethxBalance.timestamp}
              />
            )}
          </p>
        </div>
      </Modal.Body>
      <Modal.Footer
        className="bg-dark text-light"
        style={{ position: "relative" }}
      >
        <form className="form-inline" noValidate onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="amount">
            Amount
          </label>
          <input
            required
            autoFocus
            type="text"
            className="form-control mb-2 mr-sm-6 text-white"
            style={{
              backgroundColor: "#111320",
              border: "none",
              position: "absolute",
              left: "16px",
            }}
            id="amount"
            placeholder="0.00"
          />
          <button
            type="submit"
            className="btn btn-primary mb-2"
            style={{ width: "128px" }}
            disabled={isWrapping}
          >
            {isWrapping ? "Wrapping..." : "Wrap to ETHx"}
          </button>
        </form>
      </Modal.Footer>
    </Modal>
  );
}

export default WrapModal;
