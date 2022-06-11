import React from "react";
import { ethers } from "ethers";
import { truncateStr, truncateEth } from "../../lib/truncate";
import ProfileModal from "./ProfileModal";
import { sfSubgraph } from "../../redux/store";
import { NETWORK_ID } from "../../lib/constants";
import { FlowingBalance } from "./FlowingBalance";
import Spinner from "react-bootstrap/Spinner";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Image from "react-bootstrap/Image";
import { NativeAssetSuperToken } from "@superfluid-finance/sdk-core";

type ProfileProps = {
  account: string;
  disconnectWallet: () => Promise<void>;
  paymentToken: NativeAssetSuperToken;
};

function Profile({ account, disconnectWallet, paymentToken }: ProfileProps) {
  const [showProfile, setShowProfile] = React.useState(false);
  const handleCloseProfile = () => setShowProfile(false);
  const handleShowProfile = () => setShowProfile(true);

  const { isLoading, data } = sfSubgraph.useAccountTokenSnapshotsQuery(
    {
      chainId: NETWORK_ID,
      filter: {
        account: account,
        token: paymentToken.address,
      },
    },
    { pollingInterval: 5000 }
  );

  return (
    <>
      {/* <Badge
        pill
        bg="info"
        className="mr-4 py-2 px-3 text-light"
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
                balanceWei={data.items[0].balanceUntilUpdatedAt}
                flowRateWei={data.items[0].totalNetFlowRate}
                balanceTimestamp={data.items[0].updatedAtTimestamp}
              />
              <ProfileModal
                balanceData={data.items[0]}
                account={account}
                showProfile={showProfile}
                handleCloseProfile={handleCloseProfile}
                disconnectWallet={disconnectWallet}
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
          {truncateStr(account, 14)} <Image src="./ProfileIcon.png" />
        </Button>
      </ButtonGroup>
    </>
  );
}

export default Profile;
