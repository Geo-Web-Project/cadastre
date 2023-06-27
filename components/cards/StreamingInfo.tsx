import * as React from "react";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { CeramicClient } from "@ceramicnetwork/http-client";
import type { IPFS } from "ipfs-core-types";
import { Contracts } from "@geo-web/sdk/dist/contract/types";
import { GeoWebContent } from "@geo-web/content";
import ProfileModal from "../profile/ProfileModal";
import { SmartAccount } from "../../pages/index";
import { sfSubgraph } from "../../redux/store";
import { NETWORK_ID } from "../../lib/constants";
import { FlowingBalance } from "../profile/FlowingBalance";
import { truncateEth } from "../../lib/truncate";
import { ethers } from "ethers";
import { Framework, NativeAssetSuperToken } from "@superfluid-finance/sdk-core";
import { STATE } from "../Map";

type StreamingInfoProps = {
  sfFramework: Framework;
  account: string;
  signer: ethers.Signer;
  smartAccount: SmartAccount | null;
  setSmartAccount: React.Dispatch<React.SetStateAction<SmartAccount | null>>;
  ceramic: CeramicClient;
  ipfs: IPFS;
  geoWebContent: GeoWebContent;
  registryContract: Contracts["registryDiamondContract"];
  paymentToken: NativeAssetSuperToken;
  setSelectedParcelId: React.Dispatch<React.SetStateAction<string>>;
  shouldRefetchParcelsData: boolean;
  setShouldRefetchParcelsData: React.Dispatch<React.SetStateAction<boolean>>;
  setInteractionState: React.Dispatch<React.SetStateAction<STATE>>;
  setPortfolioNeedActionCount: React.Dispatch<React.SetStateAction<number>>;
};

function StreamingInfo(props: StreamingInfoProps) {
  const { account, paymentToken, smartAccount } = props;
  const [showProfile, setShowProfile] = React.useState(false);

  const { isLoading, data } = sfSubgraph.useAccountTokenSnapshotsQuery({
    chainId: NETWORK_ID,
    filter: {
      account: smartAccount?.safe ? smartAccount.address : account,
      token: paymentToken.address,
    },
  });

  const handleCloseProfile = () => setShowProfile(false);
  const handleShowProfile = () => setShowProfile(true);

  if (isLoading) {
    return <Spinner animation="border" role="status"></Spinner>;
  }

  return (
    <Card border="secondary" className="d-none d-lg-block bg-dark my-5">
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
                onClick={() => {
                  handleShowProfile();
                }}
              >
                Review your streaming payment dashboard
              </p>
              {data && (
                <ProfileModal
                  accountTokenSnapshot={data.items[0]}
                  showProfile={showProfile}
                  handleCloseProfile={handleCloseProfile}
                  {...props}
                />
              )}
            </Col>
          </Row>
        </Container>
      </Card.Body>
    </Card>
  );
}

export default StreamingInfo;
