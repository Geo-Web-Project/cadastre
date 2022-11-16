import Button from "react-bootstrap/Button";
import React from "react";
import Modal from "react-bootstrap/Modal";
import Image from "react-bootstrap/Image";

const BETA_AGREEMENT_KEY = "storedBetaAgreement";

enum BetaAgreement {
  true = "true",
  false = "false",
}

function BetaAgreementModal() {
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    setHydrated(true);
  }, []);
  const [betaAgreement, setBetaAgreement] = React.useState(
    typeof window !== "undefined"
      ? (localStorage?.getItem(BETA_AGREEMENT_KEY) as BetaAgreement) || "false"
      : null
  );
  const handleBetaAgreement = (newStyle: BetaAgreement) => {
    localStorage?.setItem(BETA_AGREEMENT_KEY, newStyle);
    setBetaAgreement(newStyle);
  };

  if (hydrated) {
    return (
      <Modal
        contentClassName="bg-dark"
        size="lg"
        show={betaAgreement === "false"}
        centered
      >
        <Modal.Header
          style={{
            background: "#111320",
            fontFamily: "Abel",
            fontSize: "1.5em",
          }}
          className="text-primary border-dark"
        >
          <Modal.Title as="h2">
            <Image src="warning.svg" className="pe-3" />
            Warning - Geo Web Beta
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-light px-4">
          <div>
            The Geo Web is in beta. The project code is unaudited and subject to
            change. No representations are made toward its efficacy or security.
            By continuing, you acknowledge that you are interacting with the
            code at your own risk.
          </div>
          <Button
            variant="secondary"
            onClick={() => handleBetaAgreement(BetaAgreement.true)}
            className={"float-end bg-primary px-5 mt-2"}
          >
            I Agree
          </Button>
        </Modal.Body>
      </Modal>
    );
  } else {
    return null;
  }
}

export default BetaAgreementModal;
