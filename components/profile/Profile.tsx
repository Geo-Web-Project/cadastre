import React from "react";
import { ethers } from "ethers";
import { truncateStr, truncateEth } from "../../lib/truncate";
import ProfileModal from "./ProfileModal";
import { sfApi } from "../../redux/store";
import { NETWORK_ID, PAYMENT_TOKEN_ADDRESS } from "../../lib/constants";
import { FlowingBalance } from "./FlowingBalance";
import { Spinner } from "../Spinner";

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
      <div
        style={{
          position: "relative",
          width: 253,
          height: 30,
          right: "40%",
          top: "calc(100vh-15)",
        }}
        onClick={handleShowProfile}
      >
        <div
          id="profile-bg"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            background: "#4B5588",
            border: "1px solid #4B5588",
            boxSizing: "border-box",
            borderRadius: 5,
          }}
        />

        <span
          style={{
            position: "absolute",
            left: "15%",
            top: "20%",
            bottom: "20%",
            fontFamily: "Abel",
            fontStyle: "normal",
            fontWeight: "normal",
            fontSize: 18,
            lineHeight: 15,
            display: "flex",
            alignItems: "center",
            textAlign: "center",
            color: "#FFFFFF",
            cursor: "pointer",
          }}
        >
          {isLoading || data == null ? (
            <div className="spinner-border" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          ) : (
            <FlowingBalance
              format={(x) => ethers.utils.formatUnits(x)}
              balanceWei={data.availableBalanceWei}
              flowRateWei={data.netFlowRateWei}
              balanceTimestamp={data.timestamp}
            />
          )}
        </span>

        <div
          id="profile-in"
          style={{
            position: "absolute",
            left: "60.11%",
            right: "0.28%",
            width: 154,
            top: "3.33%",
            bottom: "3.33%",
            background: "#111320",
            border: "1px solid #4B5588",
            boxSizing: "border-box",
            borderRadius: 5,
          }}
        />

        <span
          style={{
            position: "absolute",
            left: "61.52%",
            right: "7.58",
            top: "20%",
            bottom: "20%",
            fontFamily: "Abel",
            fontStyle: "normal",
            fontWeight: "normal",
            fontSize: 18,
            lineHeight: 15,
            display: "flex",
            alignItems: "center",
            textAlign: "center",
            color: "#FFFFFF",
            cursor: "pointer",
          }}
        >
          {truncateStr(account, 14)}
        </span>

        <img
          style={{
            position: "absolute",
            width: 20,
            height: 20,
            right: -44,
            top: 5,
          }}
          src={"./ProfileIcon.png"}
        />
      </div>
      {/* <ProfileModal
            ethBalance={"1.0"}
            account={account}
            showProfile={showProfile}
            handleCloseProfile={handleCloseProfile}
            disconnectWallet={disconnectWallet}
          /> */}
    </>
  );
}

export default Profile;
