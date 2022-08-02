import * as React from "react";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { sfSubgraph } from "../../redux/store";
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
  const { isLoading, data } = sfSubgraph.useAccountTokenSnapshotsQuery({
    chainId: NETWORK_ID,
    filter: {
      account: account,
      token: paymentToken.address,
    },
  });

  if (isLoading) {
    return <Spinner animation="border" role="status"></Spinner>;
  }

  return (
    <Card border="secondary" className="bg-dark my-5">
      <Card.Header>
        <h5 className="font-weight-bold">Important Note on Streaming Funds</h5>
      </Card.Header>
      <Card.Body>
        <Container className="p-0">
          <Row>
            <Col>
              <p>
                Your current ETHx balance is{" "}
                {data ? (
                  <FlowingBalance
                    format={(x) =>
                      truncateEth(ethers.utils.formatUnits(x), 8) + " ETHx."
                    }
                    accountTokenSnapshot={data.items[0]}
                  />
                ) : (
                  "--"
                )}
                <br />
                <br />
                Your parcels will be put in foreclosure auctions if your ETHx
                balance reaches 0 or you cancel your corresponding network fee
                streams. Make sure to keep a sufficient ETHx balance at all
                times!
              </p>
            </Col>
          </Row>
          <Row>
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
