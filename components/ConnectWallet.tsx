import Button from "react-bootstrap/Button";
import { useAccount, useNetwork } from "wagmi";
import {
  ConnectButton,
  useConnectModal,
  useChainModal,
} from "@rainbow-me/rainbowkit";
import { useMediaQuery } from "../lib/mediaQuery";

type ConnectWalletProps = {
  variant?: string;
};

export default function ConnectWallet(props: ConnectWalletProps) {
  const { variant } = props;

  const { chain } = useNetwork();
  const { status } = useAccount();
  const { openConnectModal } = useConnectModal();
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
                <Button
                  variant="primary"
                  className={`text-light border-dark ${
                    variant === "header"
                      ? "px-2 px-sm-3 py-lg-2 ms-2 ms-lg-0 me-lg-2 fw-bold"
                      : "w-100 py-2"
                  }`}
                  disabled={!mounted || status === "connecting"}
                  onClick={openConnectModal}
                >
                  {variant === "header" && isMobile
                    ? "Connect"
                    : variant === "header"
                    ? "Connect Wallet"
                    : variant === "claim"
                    ? "Connect to Continue"
                    : "Connect to Transact"}
                </Button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
