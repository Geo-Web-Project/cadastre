import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { truncateStr } from "../lib/truncate";
import { useCallback } from "react";
import { useMultiAuth } from "@ceramicstudio/multiauth";

export type TokenOptions = {
  address: string;
  symbol: string;
  decimals: number;
  image: string;
};

export const CopyTokenAddress = ({ options }: { options: TokenOptions }) => {
  const [authState] = useMultiAuth();

  const copyAddress = useCallback(() => {
    navigator.clipboard.writeText(options.address);
  }, [options.address]);

  const addToMetaMask = useCallback(() => {
    if (authState.status !== "connected") return;
    authState.connected.provider.state.provider.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options,
      },
    });
  }, []);

  return (
    <div className="bg-gray rounded d-flex align-items-center">
      <OverlayTrigger
        trigger="click"
        placement={"top"}
        delay={{ show: 250, hide: 4000 }}
        overlay={<Tooltip>Copied</Tooltip>}
      >
        <button
          onClick={copyAddress}
          className="d-flex bg-transparent border-0 align-items-center"
        >
          <img style={{ width: "16px" }} src="/eth.png" alt="eth" />
          <span className="px-2">{truncateStr(options.address, 16)}</span>
          <img style={{ width: "16px" }} src="/copy.svg" alt="copy" />
        </button>
      </OverlayTrigger>
      <button className="bg-transparent border-0 px-2" onClick={addToMetaMask}>
        <img style={{ width: "16px" }} src="/MetaMask.png" alt="metamask" />
      </button>
    </div>
  );
};
