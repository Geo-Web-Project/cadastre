import { useState } from "react";
import Button from "react-bootstrap/Button";
import { useAccount, useNetwork } from "wagmi";
import { ConnectButton, useChainModal } from "@rainbow-me/rainbowkit";
import { SmartAccount } from "../pages/index";
import ConnectAccountModal from "./profile/ConnectAccountModal";
import { useMediaQuery } from "../lib/mediaQuery";

type ConnectWalletProps = {
  variant?: string;
  setSmartAccount: React.Dispatch<React.SetStateAction<SmartAccount | null>>;
  authStatus: string;
};

export default function ConnectWallet(props: ConnectWalletProps) {
  const { variant, authStatus, setSmartAccount } = props;

  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);

  const { chain } = useNetwork();
  const { status } = useAccount();
  const { openChainModal } = useChainModal();
  const { isMobile } = useMediaQuery();

  return (
    <ConnectButton.Custom>
      {({ mounted }) => {
        return (
          <div>
            {(() => {
              if (!mounted) {
                return null;
              }

              if (chain && chain.unsupported) {
                return (
                  <Button
                    onClick={openChainModal}
                    type="button"
                    variant="danger"
                  >
                    Wrong network
                  </Button>
                );
              }

              return (
                <>
                  <Button
                    variant="primary"
                    className={`text-light border-dark ${
                      variant === "header"
                        ? "px-2 px-sm-3 py-lg-2 ms-2 ms-lg-0 me-lg-2 fw-bold"
                        : "w-100 py-2"
                    }`}
                    disabled={!mounted || status === "connecting"}
                    onClick={() => setShowAccountModal(true)}
                  >
                    {variant === "header" && isMobile
                      ? "Connect"
                      : variant === "header"
                      ? "Connect Wallet"
                      : variant === "claim"
                      ? "Connect to Continue"
                      : "Connect to Transact"}
                  </Button>
                  <ConnectAccountModal
                    showAccountModal={showAccountModal}
                    handleOpenModal={() => setShowAccountModal(true)}
                    handleCloseModal={() => setShowAccountModal(false)}
                    authStatus={authStatus}
                    setSmartAccount={setSmartAccount}
                  />
                </>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
