import { useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import { useMediaQuery } from "../../hooks/mediaQuery";

function OpRewardAlert() {
  const [show, setShow] = useState<boolean>(true);

  const { isMobile } = useMediaQuery();

  return (
    <Alert
      show={show}
      className="d-flex align-items-center gap-1 gap-sm-3 bg-dark border-0 text-light px-2 px-sm-3"
      style={{
        position: "absolute",
        top: "105px",
        left: "50%",
        zIndex: 10,
        transform: "translateX(-50%)",
        width: isMobile ? "355px" : "450px",
      }}
    >
      <Image src="op.png" alt="op" width={52} height={52} />
      <div style={{ fontSize: isMobile ? "0.9rem" : "1.0rem" }}>
        <p>Claim Geo Web land, receive OP rewards.</p>
        <a
          href="https://www.geoweb.network/post/op-incentives"
          target="_blank"
          rel="noreferrer"
          className="text-light text-decoration-underline"
        >
          Learn more about how coordination pays.
        </a>
      </div>
      <Button
        variant="link"
        size="sm"
        className="position-absolute top-0 end-0 p-0 px-sm-2 py-sm-1"
        onClick={() => setShow(false)}
      >
        <Image width={isMobile ? 20 : 28} src="close.svg" />
      </Button>
    </Alert>
  );
}

export default OpRewardAlert;
