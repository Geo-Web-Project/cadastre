import React from "react";
import { ethers } from "ethers";
import { Contracts } from "@geo-web/sdk/dist/contract/types";
import { SmartAccount } from "../../pages/IndexPage";
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
import { STATE } from "../Map";
import { truncateStr, truncateEth } from "../../lib/truncate";

type ProfileProps = {
  sfFramework: Framework;
  account: string;
  signer: ethers.Signer;
  smartAccount: SmartAccount | null;
  setSmartAccount: React.Dispatch<React.SetStateAction<SmartAccount | null>>;
  authStatus: string;
  registryContract: Contracts["registryDiamondContract"];
  setSelectedParcelId: React.Dispatch<React.SetStateAction<string>>;
  interactionState: STATE;
  setInteractionState: React.Dispatch<React.SetStateAction<STATE>>;
  paymentToken: NativeAssetSuperToken;
  shouldRefetchParcelsData: boolean;
  setShouldRefetchParcelsData: React.Dispatch<React.SetStateAction<boolean>>;
  portfolioNeedActionCount: number;
  setPortfolioNeedActionCount: React.Dispatch<React.SetStateAction<number>>;
};

function Profile(props: ProfileProps) {
  const { account, paymentToken, portfolioNeedActionCount, smartAccount } =
    props;

  const [showProfile, setShowProfile] = React.useState(false);
  const [isSafeFunded, setIsSafeFunded] = React.useState<boolean | null>(false);

  React.useEffect(() => {
    (async () => {
      if (!smartAccount?.safe) {
        setIsSafeFunded(false);
        return;
      }

      const safeBalance = await smartAccount.safe.getBalance();
      const isSafeFunded = safeBalance.gt(0);
      const isSafeDeployed = await smartAccount.safe.isSafeDeployed();

      setIsSafeFunded(isSafeFunded);

      if (!isSafeFunded && !isSafeDeployed) {
        setShowProfile(true);
      }
    })();
  }, []);

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
    <ButtonGroup className="d-flex align-items-center bg-dark border-secondary">
      <Button
        variant="secondary"
        disabled={showProfile}
        onClick={handleShowProfile}
        className="d-none d-xl-block text-light rounded-start"
      >
        {isLoading || data == null || isSafeFunded == null ? (
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
        className="d-none d-xl-flex align-items-center gap-1 text-light bg-dark rounded-end"
      >
        <span>{truncateStr(account, 14)} </span>
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
          <Image src="./account-circle.svg" width={24} />
        )}
      </Button>
      <Button
        variant="link"
        disabled={showProfile}
        onClick={handleShowProfile}
        className="ms-3 d-xl-none"
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
          <Image width={48} src="./account-circle.svg" />
        )}
      </Button>
    </ButtonGroup>
  );
}

export default Profile;
