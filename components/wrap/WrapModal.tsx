import * as React from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { ethers } from "ethers";
import { ethxABI, NETWORK_ID, PAYMENT_TOKEN_ADDRESS } from "../../lib/constants";
import { getETHBalance, getETHxBalance } from "../../lib/getBalance";

function WrapMpdal({ account, signer, show, handleClose }: any) {
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
      
    const ETHx = new ethers.Contract(PAYMENT_TOKEN_ADDRESS, ethxABI, provider);

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
    <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Modal heading</Modal.Title>
        </Modal.Header>
        <Modal.Body>Woohoo, you're reading this text in a modal!</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handleClose}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
  );

  return (
    <Modal
      show={show}
      onHide={handleClose}
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>Wrap ETH for Streaming</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Current Balances</p>
        <div style={{ padding: "0 16px" }}>
          <p>ETH: {ETHBalance ?? '---'}</p>
          <p>ETHx: {ETHxBalance ?? '---'}</p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Form noValidate onSubmit={onSubmit}>
          <Row className="align-items-center">
            <Col xs="auto">
              <Form.Label htmlFor="inlineFormInput" visuallyHidden>
                Amount
              </Form.Label>
              <Form.Control
                required
                type={"text"}
                className="mb-2"
                id="inlineFormInput"
                placeholder="0.00"
                autoFocus
              />
              <Form.Control.Feedback type="invalid">Please choose a valid amount</Form.Control.Feedback>
            </Col>
            <Col xs="auto">
              <Button type="submit" className="mb-2" disabled={isWrapping}>
                Wrap to ETHx
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal.Footer>
    </Modal>
  );
}

export default WrapMpdal;
