import * as React from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { ethers } from "ethers";
import { NETWORK_ID } from "../../lib/constants";
import { Framework } from "@superfluid-finance/sdk-core";

function WrapMpdal({ account, show, handleClose }: any) {
  const [ETHBalance, setETHBalance] = React.useState<string | undefined>();
  const [ETHxBalance, setETHxBalance] = React.useState<string | undefined>();
  const [validated, setValidated] = React.useState<boolean>(false);

  React.useEffect(() => {
    let isMounted = true;

    (async () => {
      const provider = new ethers.providers.InfuraProvider(
        NETWORK_ID,
        process.env.NEXT_PUBLIC_INFURA_ID
      );

      const balance = await provider.getBalance(account);

      const sf = await Framework.create({
        chainId: NETWORK_ID,
        provider
      });
      
      const ETHx = await sf.loadSuperToken("0xa623b2DD931C5162b7a0B25852f4024Db48bb1A0");

      const { availableBalance } = await ETHx.realtimeBalanceOf({
        account,
        // @ts-ignore
        providerOrSigner: provider,
      });

      if (isMounted) {
        setETHBalance(ethers.utils.formatEther(balance));
        setETHxBalance(ethers.utils.formatEther(availableBalance));
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const onSubmit = (e: any) => {
    e.preventDefault();
    const amount = Number((e.target[0].value));

    if (!Number.isNaN(amount) && amount > 0) {
      console.log("amount is valid", amount);
      setValidated(true);
    } else {
      // setValidated(true);
    }
  }

  return (
    <Modal show={show} onHide={handleClose}>
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
        <Form noValidate validated={validated} onSubmit={onSubmit}>
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
              <Button type="submit" className="mb-2" disabled={false}>
                {/* Insufficient ETH balance */}
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
