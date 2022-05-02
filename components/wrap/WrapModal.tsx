import * as React from "react";
import Modal from "react-bootstrap/Modal";
import { ethers } from "ethers";
import { ethxABI, NETWORK_ID } from "../../lib/constants";
import { getETHBalance, getETHxBalance } from "../../lib/getBalance";

function WrapModal({ account, signer, show, handleClose, paymentTokenAddress }: any) {
  const [ETHBalance, setETHBalance] = React.useState<string | undefined>();
  const [ETHxBalance, setETHxBalance] = React.useState<string | undefined>();
  const [isWrapping, setIsWrapping] = React.useState<boolean>(false);
  const [isBalanceInsufficient, setIsBalanceInsufficient] = React.useState<boolean>(false);

  React.useEffect(() => {
    let isMounted = true;

    (async () => {
      const provider = new ethers.providers.InfuraProvider(
        NETWORK_ID,
        process.env.NEXT_PUBLIC_INFURA_ID
      );

      const ethBalance = await getETHBalance(provider, account);

      const ethxBalance = await getETHxBalance(provider, account);

      if (isMounted) {
        setETHBalance(ethBalance);
        setETHxBalance(ethxBalance);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const wrapETH = async (amount: string) => {
    const provider = new ethers.providers.InfuraProvider(
      NETWORK_ID,
      process.env.NEXT_PUBLIC_INFURA_ID
    );
      
    const ETHx = new ethers.Contract(paymentTokenAddress, ethxABI, provider);

    const reciept = await ETHx.connect(signer).upgradeByETH({
      value: ethers.utils.parseEther(amount)
    });

    setIsWrapping(true);

    try {
      await reciept.wait();
      // Wrap ETHx successfully!
      const ethBalance = await getETHBalance(provider, account);
      const ethxBalance = await getETHxBalance(provider, account);
      // Update balances
      setETHBalance(ethBalance);
      setETHxBalance(ethxBalance);
    } catch (error) {
      console.error(error);
    };

    setIsWrapping(false);
  }

  const onSubmit = (e: any) => {
    e.preventDefault();
    const amount = Number((e.target[0].value));

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
  }

  return (
    <Modal
      show={show}
      onHide={handleClose}
      centered
    >
      <Modal.Header>
        <Modal.Title>Wrap ETH for Streaming</Modal.Title>
        <button
          type="button"
          className="close"
          data-dismiss="modal"
          aria-label="Close"
          onClick={handleClose}
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </Modal.Header>
      <Modal.Body>
        <p>Current Balances</p>
        <div style={{ padding: "0 16px" }}>
          <p>ETH: {ETHBalance ?? '---'}</p>
          <p>ETHx: {ETHxBalance ?? '---'}</p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <form
          className="form-inline"
          noValidate
          onSubmit={onSubmit}
          style={{ gap: "132px" }}
        >
          <label className="sr-only" htmlFor="amount">
            Amount
          </label>
          <input
            required
            autoFocus
            type="text"
            className="form-control mb-2 mr-sm-6"
            id="amount"
            placeholder="0.00"
          />
          <button type="submit" className="btn btn-primary mb-2" disabled={isWrapping}>
            {isWrapping ? 'Wrapping...' : 'Wrap to ETHx'}
          </button>
        </form>
      </Modal.Footer>
    </Modal>
  );
}

export default WrapModal;
