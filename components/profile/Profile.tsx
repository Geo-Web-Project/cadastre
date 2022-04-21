import React from "react";
import { ethers } from "ethers";
import { truncateStr, truncateEth } from "../../lib/truncate";
import ProfileModal from "./ProfileModal";
import { sfApi } from "../../redux/store";
import { NETWORK_ID, PAYMENT_TOKEN_ADDRESS } from "../../lib/constants";
import { FlowingBalance } from "./FlowingBalance";
import Spinner from "react-bootstrap/Spinner";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Image from "react-bootstrap/Image";

function Profile({
  account,
  disconnectWallet,
}: {
  account: string;
  disconnectWallet: () => Promise<void>;
}) {
  const [showProfile, setShowProfile] = React.useState(false);
  const handleCloseProfile = () => setShowProfile(false);
  const handleShowProfile = () => setShowProfile(true);

  const { isLoading, data } = sfApi.useGetRealtimeBalanceQuery({
    chainId: NETWORK_ID,
    accountAddress: account,
    superTokenAddress: PAYMENT_TOKEN_ADDRESS,
    estimationTimestamp: undefined,
  });

  return (
    <>
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
                balanceWei={data.availableBalanceWei}
                flowRateWei={data.netFlowRateWei}
                balanceTimestamp={data.timestamp}
              />
              <ProfileModal
                balanceData={data}
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
