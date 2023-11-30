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
};

export const CopyTokenAddress = ({
  options,
  size,
}: {
  options: TokenOptions;
  size?: string;
}) => {
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
    <Card
      className={`"bg-gray rounded me-xl-0 p-0 m-0 ${
        size === "s" ? "bg-transparent border-0" : ""
      }`}
    >
      <Card.Body className="d-flex justify-content-around p-0">
        {size === "s" ? (
          <CopyTooltip
            contentClick="Copied"
            contentHover="Copy ETHx Contract Address"
            target={
              <Image
                width={
                  size === "s" && isMobile
                    ? 13
                    : size === "s" && isTablet
                    ? 16
                    : 18
                }
                src="/copy-light.svg"
                alt="copy"
              />
            }
            handleCopy={copyAddress}
          />
        ) : (
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
                <span className="text-black text-break px-2">
                  <span
                    style={{
                      fontSize: "1rem",
                    }}
                  >
                    {truncateStr(
                      options.address,
                      isMobile || isTablet ? 12 : 16
                    )}
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
        )}
        <Button
          className={`bg-transparent border-0 ${
            size === "s" ? "d-flex align-items-center ms-1 p-0" : "px-2"
          }`}
          onClick={addToMetaMask}
        >
          <Image
            width={size === "s" && isMobile ? 13 : 16}
            src="/MetaMask.png"
            alt="metamask"
          />
        </Button>
      </Card.Body>
    </Card>
  );
};
