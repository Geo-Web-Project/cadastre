import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import { useAccount, useNetwork } from "wagmi";
import {
  ConnectButton,
  useConnectModal,
  useChainModal,
} from "@rainbow-me/rainbowkit";

type ConnectWalletProps = {
  variant?: string;
};

export default function ConnectWallet(props: ConnectWalletProps) {
  const { variant } = props;

  const { chain } = useNetwork();
  const { status } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { openChainModal } = useChainModal();

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
                  variant={variant === "header" ? "outline-primary" : "primary"}
                  className={`text-light border-dark ${
                    variant === "header" ? "fw-bold" : "w-100 fs-6 py-2"
                  }`}
                  disabled={!mounted || status === "connecting"}
                  style={{ height: variant === "header" ? "100px" : "auto" }}
                  onClick={openConnectModal}
                >
                  {variant === "header" && (
                    <Image
                      src="vector.png"
                      width="40"
                      style={{ marginRight: 20 }}
                    />
                  )}
                  {variant === "header"
                    ? "Connect Wallet"
                    : variant === "claim"
                    ? "Connect to Claim"
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