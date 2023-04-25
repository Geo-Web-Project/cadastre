import { useCallback } from "react";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Card from "react-bootstrap/Card";
import { useSigner } from "wagmi";
import CopyTooltip from "./CopyTooltip";
import { truncateStr } from "../lib/truncate";
import { useMediaQuery } from "../lib/mediaQuery";

export type TokenOptions = {
  address: string;
  symbol: string;
  decimals: number;
  image: string;
  size?: string;
};

export const CopyTokenAddress = ({ options }: { options: TokenOptions }) => {
  const { data: signer } = useSigner();
  const { isMobile, isTablet } = useMediaQuery();

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
    <Card className="bg-gray rounded me-xl-0">
      <Card.Body className="d-flex justify-content-around flex-wrap p-0">
        <CopyTooltip
          contentClick="Copied"
          contentHover="Copy Address"
          target={
            <div className="d-flex flex-shrink-1 align-items-center">
              <Image
                className="me-lg-1 me-xl-0"
                width={isMobile ? 12 : 16}
                src="/eth.png"
                alt="eth"
              />
              <span
                className={`text-black text-break ${
                  options.size === "small" ? "px-1 small" : "px-2"
                }`}
              >
                <span
                  style={{
                    fontSize:
                      isMobile && options.size === "small"
                        ? "0.8rem"
                        : isTablet && options.size === "small"
                        ? "0.9rem"
                        : "1rem",
                  }}
                >
                  {truncateStr(options.address, isMobile || isTablet ? 12 : 16)}
                </span>
              </span>
              <Image
                width={isMobile || isTablet ? 14 : 18}
                src="/copy-dark.svg"
                alt="copy"
              />
            </div>
          }
          handleCopy={copyAddress}
        />
        <Button
          className={`bg-transparent border-0 ${
            options.size === "small" ? "p-0 pb-1 pe-1 p-sm-1" : "px-2"
          }`}
          onClick={addToMetaMask}
        >
          <Image
            width={isMobile || isTablet ? 14 : 16}
            src="/MetaMask.png"
            alt="metamask"
          />
        </Button>
      </Card.Body>
    </Card>
  );
};
