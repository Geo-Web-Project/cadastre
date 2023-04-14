import { useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";

function OpRewardAlert() {
  const [show, setShow] = useState<boolean>(true);

  return (
    <Alert
      show={show}
      className="d-flex align-items-center gap-3 bg-dark border-0 text-light"
      style={{
        position: "absolute",
        top: "105px",
        left: "50%",
        zIndex: 1,
        transform: "translateX(-50%)",
        width: "450px",
      }}
    >
      <Image src="op.png" alt="op" width={52} height={52} />
      <div>
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
        className="position-absolute top-0 end-0"
        onClick={() => setShow(false)}
      >
        <Image width={28} src="close.svg" />
      </Button>
    </Alert>
  );
}

export default OpRewardAlert;
