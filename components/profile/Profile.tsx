import React from "react";
import { ethers } from "ethers";
import { Contracts } from "@geo-web/sdk/dist/contract/types";
import { GeoWebContent } from "@geo-web/content";
import { CeramicClient } from "@ceramicnetwork/http-client";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import type { InvocationConfig } from "@web3-storage/upload-client";
import type { Point } from "@turf/turf";
import ProfileModal from "./ProfileModal";
import { sfSubgraph } from "../../redux/store";
import { NETWORK_ID } from "../../lib/constants";
import { FlowingBalance } from "./FlowingBalance";
import Spinner from "react-bootstrap/Spinner";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Image from "react-bootstrap/Image";
import Badge from "react-bootstrap/Badge";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { Framework, NativeAssetSuperToken } from "@superfluid-finance/sdk-core";
import type { IPFS } from "ipfs-core-types";
import { STATE } from "../Map";
import { truncateStr, truncateEth } from "../../lib/truncate";

type ProfileProps = {
  sfFramework: Framework;
  account: string;
  signer: ethers.Signer;
  ceramic: CeramicClient;
  setCeramic: React.Dispatch<React.SetStateAction<CeramicClient | null>>;
  setW3InvocationConfig: React.Dispatch<React.SetStateAction<InvocationConfig>>;
  ipfs: IPFS;
  geoWebContent: GeoWebContent;
  setGeoWebContent: React.Dispatch<React.SetStateAction<GeoWebContent | null>>;
  registryContract: Contracts["registryDiamondContract"];
  setSelectedParcelId: React.Dispatch<React.SetStateAction<string>>;
  interactionState: STATE;
  setInteractionState: React.Dispatch<React.SetStateAction<STATE>>;
  paymentToken: NativeAssetSuperToken;
  portfolioNeedActionCount: number;
  setPortfolioNeedActionCount: React.Dispatch<React.SetStateAction<number>>;
  setParcelNavigationCenter: React.Dispatch<React.SetStateAction<Point | null>>;
  shouldRefetchParcelsData: boolean;
  setShouldRefetchParcelsData: React.Dispatch<React.SetStateAction<boolean>>;
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
    <ButtonGroup className="d-flex align-items-center fit-content bg-dark border-secondary">
      <Button
        variant="secondary"
        disabled={showProfile}
        onClick={handleShowProfile}
        className="d-none d-lg-block text-light"
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
        className="d-none d-lg-block text-light bg-dark"
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
      <Button
        variant="link"
        disabled={showProfile}
        onClick={handleShowProfile}
        className="ms-3 d-lg-none"
      >
        {portfolioNeedActionCount ? (
          <OverlayTrigger
            trigger={["hover", "focus"]}
            placement="bottom"
            delay={{ show: 250, hide: 400 }}
            overlay={
              <Tooltip>You have parcels that require attention.</Tooltip>
            }
          >
            <Badge className="fs-6" bg="danger" pill={true} text="light">
              {portfolioNeedActionCount}
            </Badge>
          </OverlayTrigger>
        ) : (
          <Image width={36} src="./ProfileIcon.png" />
        )}
      </Button>
    </ButtonGroup>
  );
}

export default Profile;
