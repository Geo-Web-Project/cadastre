import * as React from "react";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { sfApi } from "../../redux/store";
import { NETWORK_ID } from "../../lib/constants";
import { FlowingBalance } from "../profile/FlowingBalance";
import { truncateEth } from "../../lib/truncate";
import { ethers } from "ethers";
import { NativeAssetSuperToken } from "@superfluid-finance/sdk-core";

type StreamingInfoProps = {
  account: string;
  paymentToken: NativeAssetSuperToken;
};

function StreamingInfo({ account, paymentToken }: StreamingInfoProps) {
  const { isLoading, data } = sfApi.useGetRealtimeBalanceQuery({
    chainId: NETWORK_ID,
    accountAddress: account,
    superTokenAddress: paymentToken.address,
    estimationTimestamp: undefined,
  });

  if (isLoading) {
    return <Spinner animation="border" role="status"></Spinner>;
  }

  return (
    <Card border="secondary" className="bg-dark my-5">
      <Card.Body>
        <Container>
          <Row>
            <Col xs={1} style={{ alignSelf: "center" }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-exclamation-circle-fill"
                viewBox="0 0 16 16"
              >
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
              </svg>
            </Col>
            <Col>
              <p>
                Your current ETHx balance is{" "}
                {data ? (
                  <FlowingBalance
                    format={(x) =>
                      truncateEth(ethers.utils.formatUnits(x), 3) + " ETHx"
                    }
                    balanceWei={data.availableBalanceWei}
                    flowRateWei={data.netFlowRateWei}
                    balanceTimestamp={data.timestamp}
                  />
                ) : (
                  "--"
                )}
                . We recommend wrapping enough ETH to cover at least&nbsp; 3
                months of payments for ALL of your outstanding streams&nbsp;
                plus any required 1-time payments and deposits.
              </p>
            </Col>
          </Row>
          <Row>
            <Col xs={1}> </Col>
            <Col>
              <p>
                {/* FIXME: add href link for paymnent dashboard if it is finished. */}
                <a href={"/TODO"} target="_blank" rel="noreferrer">
                  Review your streaming payment dashboard
                </a>
              </p>
            </Col>
          </Row>
        </Container>
      </Card.Body>
    </Card>
  );
}

export default StreamingInfo;
