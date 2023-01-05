import { useCallback } from "react";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import { useSigner } from "wagmi";
import CopyTooltip from "./CopyTooltip";
import { truncateStr } from "../lib/truncate";

export type TokenOptions = {
  address: string;
  symbol: string;
  decimals: number;
  image: string;
  size?: string;
};

export const CopyTokenAddress = ({ options }: { options: TokenOptions }) => {
  const { data: signer } = useSigner();

  const copyAddress = useCallback(() => {
    navigator.clipboard.writeText(options.address);
  }, [options.address]);

  const addToMetaMask = useCallback(() => {
    if (!options.address) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (signer?.provider as any).provider.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options,
      },
    });
  }, []);

  return (
    <div className="bg-gray rounded d-flex align-items-center">
      <CopyTooltip
        contentClick="Copied"
        contentHover="Copy Address"
        target={
          <div className="d-flex align-items-center">
            <Image style={{ width: "16px" }} src="/eth.png" alt="eth" />
            <span
              className={`text-black ${
                options.size === "small" ? "px-1 small" : "px-2"
              }`}
            >
              {truncateStr(options.address, 16)}
            </span>
            <Image style={{ width: "16px" }} src="/copy.svg" alt="copy" />
          </div>
        }
        handleCopy={copyAddress}
      />
      <Button
        className={`bg-transparent border-0 ${
          options.size === "small" ? "px-1" : "px-2"
        }`}
        onClick={addToMetaMask}
      >
        <Image style={{ width: "16px" }} src="/MetaMask.png" alt="metamask" />
      </Button>
    </div>
  );
};
