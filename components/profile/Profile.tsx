import React from "react";
import { ethers } from "ethers";
import { CeramicClient } from "@ceramicnetwork/http-client";
import { Contracts } from "@geo-web/sdk/dist/contract/types";
import { truncateStr, truncateEth } from "../../lib/truncate";
import ProfileModal from "./ProfileModal";
import { sfSubgraph } from "../../redux/store";
import { NETWORK_ID, PAYMENT_TOKEN_FAUCET_URL } from "../../lib/constants";
import { FlowingBalance } from "./FlowingBalance";
import Spinner from "react-bootstrap/Spinner";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Image from "react-bootstrap/Image";
import Badge from "react-bootstrap/Badge";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { NativeAssetSuperToken } from "@superfluid-finance/sdk-core";
import { STATE, GeoPoint } from "../Map";

type ProfileProps = {
  account: string;
  ceramic: CeramicClient;
  registryContract: Contracts["registryDiamondContract"];
  setSelectedParcelId: React.Dispatch<React.SetStateAction<string>>;
  interactionState: STATE;
  setInteractionState: React.Dispatch<React.SetStateAction<STATE>>;
  disconnectWallet: () => Promise<void>;
  paymentToken: NativeAssetSuperToken;
  provider: ethers.providers.Web3Provider;
  portfolioNeedActionCount: number;
  setPortfolioNeedActionCount: React.Dispatch<React.SetStateAction<number>>;
  setPortfolioParcelCoords: React.Dispatch<
    React.SetStateAction<GeoPoint | null>
  >;
  isPortfolioToUpdate: boolean;
  setIsPortfolioToUpdate: React.Dispatch<React.SetStateAction<boolean>>;
};

function Profile(props: ProfileProps) {
  const { account, paymentToken, portfolioNeedActionCount } = props;
  const [showProfile, setShowProfile] = React.useState(false);
  const handleCloseProfile = () => setShowProfile(false);
  const handleShowProfile = () => setShowProfile(true);

  const { isLoading, data } = sfSubgraph.useAccountTokenSnapshotsQuery(
    {
      chainId: NETWORK_ID,
      filter: {
        account: account,
        token: paymentToken?.address ?? "",
      },
    },
    { pollingInterval: 5000, skip: paymentToken == null }
  );

  return (
    <div className="d-flex flex-column ms-auto align-items-center fit-content">
      {/* <Badge
        pill
        bg="info"
        className="me-4 py-2 px-3 text-light"
      >
        <span style={{ fontWeight: 600 }}>{NETWORK_NAME}</span>
      </Badge> */}
      <ButtonGroup className="bg-dark border-secondary">
        <Button
          variant="secondary"
          disabled={showProfile}
          onClick={handleShowProfile}
          className="text-light"
        >
          {isLoading || data == null ? (
            <Spinner animation="border" role="status"></Spinner>
          ) : (
            <>
              <FlowingBalance
                format={(x) =>
                  truncateEth(ethers.utils.formatUnits(x), 3) + " ETHx"
                }
                accountTokenSnapshot={data.items[0]}
              />
              <ProfileModal
                accountTokenSnapshot={data.items[0]}
                showProfile={showProfile}
                handleCloseProfile={handleCloseProfile}
                {...props}
              />
            </>
          )}
        </Button>
        <Button
          variant="outline-secondary"
          disabled={showProfile}
          onClick={handleShowProfile}
          className="text-light bg-dark"
        >
          {truncateStr(account, 14)}{" "}
          {portfolioNeedActionCount ? (
            <OverlayTrigger
              trigger={["hover", "focus"]}
              placement="bottom"
              delay={{ show: 250, hide: 400 }}
              overlay={
                <Tooltip>You have parcels that require attention.</Tooltip>
              }
            >
              <Badge bg="danger" pill={true} text="light">
                {portfolioNeedActionCount}
              </Badge>
            </OverlayTrigger>
          ) : (
            <Image src="./ProfileIcon.png" />
          )}
        </Button>
      </ButtonGroup>
      <a
        className="faucet-link text-white mt-1"
        target="_blank"
        href={PAYMENT_TOKEN_FAUCET_URL}
      >
        Request testnet ETH
      </a>
    </div>
  );
}

export default Profile;
