import { useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import { useMediaQuery } from "../lib/mediaQuery";

function BedrockDowntimeAlert() {
  const [show, setShow] = useState<boolean>(true);

  const { isMobile, isTablet } = useMediaQuery();

  return (
    <Alert
      show={show}
      className="d-flex align-items-center gap-3 bg-dark border-0 text-light px-2 px-sm-3"
      style={{
        position: "absolute",
        top: "105px",
        left: "50%",
        zIndex: 10,
        transform: "translateX(-50%)",
        width: isMobile ? "355px" : isTablet ? "420px" : "450px",
      }}
    >
      <Button
        variant="link"
        size="sm"
        className="position-absolute top-0 end-0 p-1 px-sm-1 py-sm-1"
        onClick={() => setShow(false)}
      >
        <Image width={isMobile ? 26 : 28} src="close.svg" />
      </Button>
      <Image src="op.png" alt="op" width={52} height={52} />
      <div
        className="px-1"
        style={{ fontSize: isMobile ? "0.9rem" : "1.0rem" }}
      >
        Notice: The Optimism network will undergo its{" "}
        <a
          href="https://oplabs.notion.site/Bedrock-Mission-Control-EXTERNAL-fca344b1f799447cb1bcf3aae62157c5"
          target="_blank"
          rel="noreferrer"
          className="text-light text-decoration-underline"
        >
          Bedrock upgrade
        </a>{" "}
        and 2-4 hours of downtime starting at 16:00 UTC on June 6th. <br />
        You will not be able to transact on the Geo Web during this upgrade.
        <br />
        <a
          href="https://twitter.com/thegeoweb"
          target="_blank"
          rel="noreferrer"
          className="text-light text-decoration-underline"
        >
          Follow us on Twitter
        </a>{" "}
        for updates.
      </div>
    </Alert>
  );
}

export default BedrockDowntimeAlert;
