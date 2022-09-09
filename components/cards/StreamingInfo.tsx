import * as React from "react";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { CeramicClient } from "@ceramicnetwork/http-client";
import { Contracts } from "@geo-web/sdk/dist/contract/types";
import ProfileModal from "../profile/ProfileModal";
import { sfSubgraph } from "../../redux/store";
import { NETWORK_ID } from "../../lib/constants";
import { FlowingBalance } from "../profile/FlowingBalance";
import { truncateEth } from "../../lib/truncate";
import { ethers } from "ethers";
import { NativeAssetSuperToken } from "@superfluid-finance/sdk-core";
import { useMultiAuth } from "@ceramicstudio/multiauth";

type StreamingInfoProps = {
  account: string;
  ceramic: CeramicClient;
  registryContract: Contracts["registryDiamondContract"];
  paymentToken: NativeAssetSuperToken;
  provider: ethers.providers.Web3Provider;
  setPortfolioNeedActionCount: React.Dispatch<React.SetStateAction<number>>;
};

function StreamingInfo({
  account,
  ceramic,
  registryContract,
  paymentToken,
  provider,
  setPortfolioNeedActionCount,
}: StreamingInfoProps) {
  const [authState, activate, deactivate] = useMultiAuth();
  const [showProfile, setShowProfile] = React.useState(false);

  const { isLoading, data } = sfSubgraph.useAccountTokenSnapshotsQuery({
    chainId: NETWORK_ID,
    filter: {
      account: account,
      token: paymentToken.address,
    },
  });

  const handleCloseProfile = () => setShowProfile(false);
  const handleShowProfile = () => setShowProfile(true);
  const disconnectWallet = () => deactivate();

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
              <p
                className="text-primary cursor-pointer"
                onClick={(e) => {
                  handleShowProfile();
                }}
              >
                Review your streaming payment dashboard
              </p>
              <ProfileModal
                accountTokenSnapshot={data.items[0]}
                account={account}
                ceramic={ceramic}
                registryContract={registryContract}
                paymentToken={paymentToken}
                provider={provider}
                showProfile={showProfile}
                handleCloseProfile={handleCloseProfile}
                disconnectWallet={disconnectWallet}
                setPortfolioNeedActionCount={setPortfolioNeedActionCount}
              />
            </Col>
          </Row>
        </Container>
      </Card.Body>
    </Card>
  );
}

export default StreamingInfo;
