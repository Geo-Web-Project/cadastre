import React from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { ethers } from "ethers";
import { truncateStr, truncateEth } from "../../lib/truncate";

function ProfileModal(props: any) {
  const {
    ethBalance,
    account,
    showProfile,
    disconnectWallet,
    handleCloseProfile,
    adminContract,
    pendingWithdrawAmt,
  } = props;

  const [addr, setAddr] = React.useState("");
  const [balance, setBalance] = React.useState("");

  React.useEffect(() => {
    if (account) setAddr(account);
    if (ethBalance) setBalance(ethers.utils.formatEther(ethBalance));
  }, [account, ethBalance]);

  const deactivateProfile = () => {
    disconnectWallet();
    handleCloseProfile();
  };

  return (
    <Modal show={showProfile} onHide={handleCloseProfile}>
      <Modal.Header
        style={{ background: "#202333", color: "#2FC1C1" }}
        closeButton
      >
        <Modal.Title>Profile</Modal.Title>
      </Modal.Header>
      <Modal.Body
        style={{
          background: "#202333",
          fontFamily: "Abel",
          fontStyle: "normal",
          fontWeight: "normal",
        }}
      >
        <div
          style={{
            position: "relative",
            top: -70,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <img
            style={{ width: 25, height: 25, left: 40, top: 78 }}
            src={"./ProfileIcon.png"}
          />

          <span
            style={{
              fontSize: 15,
              lineHeight: 15,
              color: "#FFFFFF",
              marginLeft: 10,
            }}
          >
            {addr}
          </span>

          <button
            type="button"
            style={{
              background: "rgba(255, 255, 255, 0.43)",
              border: "1px solid #FFFFFF",
              boxSizing: "border-box",
              borderEadius: 5,
              width: 96,
              height: 22,
              marginLeft: 10,
              fontSize: 15,
              lineHeight: 15,
              color: "#FFFFFF",
            }}
            onClick={() => deactivateProfile()}
          />

          <span
            style={{
              position: "absolute",
              width: 142,
              height: 9,
              left: "79%",
              top: "45%",
              color: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            {`Disconnect`}
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            width: 453,
            height: 69,
            left: "4%",
            top: "40%",
            background: "#111320",
            fontSize: 18,
            lineHeight: 15,
            alignItems: "center",
          }}
        />

        <span
          style={{
            position: "absolute",
            top: "45%",
            left: "7%",
            color: "#FFFFFF",
          }}
        >{`Wallet Balance: ${balance} ETH`}</span>

        <span
          style={{
            position: "absolute",
            top: "55%",
            left: "7%",
            color: "#FFFFFF",
          }}
        >
          {`Unclaimed Transfer Proceeds: ${ethers.utils.formatEther(
            pendingWithdrawAmt
          )} ETH`}
        </span>

        <Button
          style={{
            position: "absolute",
            left: "66.92%",
            top: "72%",
            width: 140,
            height: 26,
            background: "#2FC1C1",
            borderRadius: 5,
            fontSize: 15,
            lineHeight: 15,
            color: "#FFFFFF",
          }}
          onClick={() => adminContract.withdraw()}
        />

        <span
          style={{
            position: "absolute",
            width: 142,
            height: 9,
            left: "72%",
            top: "72%",
            bottom: "32.65%",
            color: "#FFFFFF",
            cursor: "pointer",
          }}
        >
          {`Claim Proceeds`}
        </span>
      </Modal.Body>
    </Modal>
  );
}

export default ProfileModal;
