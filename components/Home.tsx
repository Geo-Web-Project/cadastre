import { useState, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Spinner from "react-bootstrap/Spinner";

const BETA_AGREEMENT_KEY = "storedBetaAgreement";

type HomeProps = {
  setIsFirstVisit: React.Dispatch<React.SetStateAction<boolean>>;
};

function Home(props: HomeProps) {
  const { setIsFirstVisit } = props;

  const [betaAgreement, setBetaAgreement] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  const handleBetaAgreement = (newStyle: string) => {
    localStorage?.setItem(BETA_AGREEMENT_KEY, newStyle);
    setBetaAgreement(newStyle);
    setIsFirstVisit(false);
  };

  useEffect(() => {
    const betaAgreement = localStorage?.getItem(BETA_AGREEMENT_KEY);

    if (betaAgreement) {
      setBetaAgreement(betaAgreement);
      setIsFirstVisit(false);
    }

    setIsHydrated(true);
  }, []);

  return (
    <div
      style={{
        background: "url(bg.jpg) no-repeat center",
        backgroundSize: "cover",
        paddingBottom: "24px",
        position: "absolute",
        left: "0",
        top: "0",
        padding: "16px",
        paddingTop: "128px",
        minHeight: "100svh",
        minWidth: "100vw",
      }}
    >
      <div className="position-absolute top-50 start-50 translate-middle">
        <Spinner animation="border" role="status" variant="light">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
      {isHydrated && (
        <Modal
          contentClassName="bg-dark"
          size="lg"
          show={!betaAgreement}
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
              The Geo Web is in beta. The project code is unaudited and subject
              to change. No representations are made toward its efficacy or
              security. By continuing, you acknowledge that you are interacting
              with the code at your own risk.
            </div>
            <Button
              variant="secondary"
              onClick={() => handleBetaAgreement("true")}
              className={"float-end bg-primary px-5 mt-2"}
            >
              I Agree
            </Button>
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
}

export default Home;
