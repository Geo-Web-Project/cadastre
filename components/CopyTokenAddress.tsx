import { OverlayTrigger, Tooltip, Button } from "react-bootstrap";
import { truncateStr } from "../lib/truncate";
import { useCallback } from "react";
import { useMultiAuth } from "@ceramicstudio/multiauth";
import Image from "react-bootstrap/Image";

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider: any = authState.connected.provider.state.provider;
    provider.request({
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
        <Button
          onClick={copyAddress}
          className="d-flex bg-transparent border-0 align-items-center"
        >
          <Image style={{ width: "16px" }} src="/eth.png" alt="eth" />
          <span className="px-2 text-black">{truncateStr(options.address, 16)}</span>
          <Image style={{ width: "16px" }} src="/copy.svg" alt="copy" />
        </Button>
      </OverlayTrigger>
      <Button className="bg-transparent border-0 px-2" onClick={addToMetaMask}>
        <Image style={{ width: "16px" }} src="/MetaMask.png" alt="metamask" />
      </Button>
    </div>
  );
};
