import { useState, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import ListGroup from "react-bootstrap/ListGroup";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";

const WELCOME_CHECKLIST = "welcomeChecklist";

function WelcomeChecklist() {
  const [welcomeChecklist, setWelcomeChecklist] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  const handleWelcomeChecklist = (val: string) => {
    localStorage?.setItem(WELCOME_CHECKLIST, val);
    setWelcomeChecklist(val);
  };

  useEffect(() => {
    const welcomeChecklist = localStorage?.getItem(WELCOME_CHECKLIST);

    if (welcomeChecklist) {
      setWelcomeChecklist(welcomeChecklist);
    }

    setIsHydrated(true);
  }, []);

  if (!isHydrated || welcomeChecklist) {
    return null;
  }

  return (
    <Modal
      contentClassName="bg-dark"
      size="xl"
      show={!welcomeChecklist}
      centered
      scrollable
    >
      <Modal.Header className="text-primary border-0 pb-0">
        <Modal.Title as="h2">Welcome to the Cadastre</Modal.Title>
        <Button
          variant="link"
          size="sm"
          className="position-absolute top-0 end-0 pt-1 pe-1 px-sm-2 py-sm-2"
          onClick={() => handleWelcomeChecklist("true")}
        >
          <Image width={30} src="close.svg" />
        </Button>
      </Modal.Header>
      <Modal.Body className="bg-dark text-light px-4 fs-4">
        <p>
          Here are the most important things to know to get started with the Geo
          Web:
        </p>
        <ListGroup as="ol" numbered>
          <ListGroup.Item
            as="li"
            className="d-inline-flex gap-1 bg-dark border-0 text-light px-0 py-1"
            style={{ listStylePosition: "inside" }}
          >
            <div>
              You need ETH on the{" "}
              <a
                href="https://chainlist.org/chain/10"
                target="_blank"
                rel="noreferrer"
                className="text-primary"
              >
                Optimism network
              </a>{" "}
              to transact in the land market. Plan for at least .007 ETH per
              parcel:
            </div>
          </ListGroup.Item>
          <ListGroup as="ul" className="list-unstyled">
            <ListGroup.Item
              as="li"
              className="d-inline-flex gap-1 bg-dark border-0 text-light ms-2 px-0 py-1"
            >
              &#x2022;
              <div>
                Deposit from a{" "}
                <a
                  href="https://help.optimism.io/hc/en-us/articles/10800854161563-Centralized-exchanges-that-support-Optimism"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary"
                >
                  centralized exchange
                </a>
              </div>
            </ListGroup.Item>
            <ListGroup.Item
              as="li"
              className="d-inline-flex gap-1 bg-dark border-0 text-light ms-2 px-0 py-1"
            >
              &#x2022;
              <div>
                Use the{" "}
                <a
                  href="https://app.optimism.io/bridge/deposit"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary"
                >
                  official
                </a>{" "}
                or a{" "}
                <a
                  href="https://www.optimism.io/apps/bridges"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary"
                >
                  3rd-party bridge
                </a>
              </div>
            </ListGroup.Item>
            <ListGroup.Item
              as="li"
              className="d-inline-flex gap-1 bg-dark border-0 text-light ms-2 px-0 py-1"
            >
              &#x2022;
              <div>
                Buy it on{" "}
                <a
                  href="https://global.transak.com/?defaultCryptoCurrency=ETH&network=OPTIMISM"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary"
                >
                  fiat on-ramp service
                </a>
              </div>
            </ListGroup.Item>
          </ListGroup>
          <ListGroup.Item
            as="li"
            className="d-inline-flex gap-1 bg-dark border-0 text-light px-0 py-1"
          >
            <div>
              The market is administered using{" "}
              <a
                href="https://docs.geoweb.network/concepts/partial-common-ownership"
                target="_blank"
                rel="noreferrer"
                className="text-primary"
              >
                partial common ownership
              </a>
              . You must maintain:
            </div>
          </ListGroup.Item>
          <ListGroup as="ul">
            <ListGroup.Item
              as="li"
              className="d-inline-flex gap-1 bg-dark border-0 text-light ms-2 px-0 py-1"
            >
              &#x2022;
              <div>
                A public <em>For Sale Price</em> for each of your parcels
              </div>
            </ListGroup.Item>
            <ListGroup.Item
              as="li"
              className="d-inline-flex gap-1 bg-dark border-0 text-light ms-2 px-0 py-1"
            >
              &#x2022;
              <div>
                A <em>Network Fee</em> stream equal to 10% per year of each For
                Sale Price
              </div>
            </ListGroup.Item>
          </ListGroup>
          <ListGroup.Item
            as="li"
            className="d-inline-flex gap-1 bg-dark border-0 text-light px-0 py-1"
          >
            <div>
              Each claim requires a flat 0.005 ETHx registration payment. For
              additional guidance,{" "}
              <a
                href="https://docs.geoweb.network/getting-started/claim"
                target="_blank"
                rel="noreferrer"
                className="text-primary"
              >
                check out our onboarding guides
              </a>
              .
            </div>
          </ListGroup.Item>
          <ListGroup.Item
            as="li"
            className="d-inline-flex gap-1 bg-dark border-0 text-light px-0 py-1"
          >
            <div>
              100% of the land market proceeds are{" "}
              <a
                href="https://docs.geoweb.network/community-and-governance/network-funds-allocation"
                target="_blank"
                rel="noreferrer"
                className="text-primary"
              >
                allocated to public goods and free market incentives
              </a>
              .
            </div>
          </ListGroup.Item>
        </ListGroup>
        <Modal.Footer className="border-0 p-0">
          <Button
            variant="secondary"
            onClick={() => handleWelcomeChecklist("true")}
            className={"float-end bg-primary px-5 mt-3"}
          >
            Continue
          </Button>
        </Modal.Footer>
      </Modal.Body>
    </Modal>
  );
}
export default WelcomeChecklist;
