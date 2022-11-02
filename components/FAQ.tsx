/* eslint-disable import/no-unresolved */
import * as React from "react";
import Button from "react-bootstrap/Button";
import Accordion from "react-bootstrap/Accordion";
import AccordionContext from "react-bootstrap/AccordionContext";
import Card from "react-bootstrap/Card";
import { useAccordionButton } from "react-bootstrap/AccordionButton";
import Modal from "react-bootstrap/Modal";
import { PAYMENT_TOKEN_FAUCET_URL, PAYMENT_TOKEN } from "../lib/constants";
import Image from "react-bootstrap/Image";

function ContextAwareToggle({
  eventKey,
  callback,
  children,
}: {
  eventKey: string;
  callback?: (v: string) => void;
  children: string;
}) {
  const currentEventKey = React.useContext(AccordionContext);

  const decoratedOnClick = useAccordionButton(
    eventKey,
    () => callback && callback(eventKey)
  );

  const isCurrentEventKey = currentEventKey === eventKey;

  return (
    <Accordion.Item
      className="fw-bold border-dark text-light bg-transparent"
      as={Card.Header}
      onClick={decoratedOnClick}
      style={{ fontSize: "1.25em", cursor: "pointer" }}
      eventKey={eventKey}
    >
      {isCurrentEventKey ? "-" : "+"} {children}
    </Accordion.Item>
  );
}

function FAQ() {
  const [show, setShow] = React.useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <>
      <Button
        variant="outline-primary"
        className="text-light fw-bold border-dark d-flex align-items-center gap-1"
        style={{ height: "100px", width: "100px" }}
        onClick={handleShow}
      >
        <Image src="help.svg" />FAQ
      </Button>
      <Modal
        show={show}
        size="lg"
        onHide={handleClose}
        contentClassName="bg-dark"
      >
        <Modal.Header
          style={{
            background: "#111320",
            fontFamily: "Abel",
            fontSize: "1.5em",
          }}
          className="text-primary border-dark"
        >
          <Modal.Title as="h2">FAQ</Modal.Title>
          <Button variant="link" size="sm" onClick={handleClose}>
            <Image src="close.svg" />
          </Button>
        </Modal.Header>
        <Modal.Body className="bg-dark text-light">
          <Accordion defaultActiveKey="0">
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="0">
                What is the Geo Web?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="0">
                <Card.Body>
                  <p>
                    The Geo Web is a set of protocols and system of property
                    rights for anchoring digital content to physical land.
                  </p>
                  <p>
                    Users interact with Geo Web content through a{" "}
                    <a
                      href="https://geoweb.app/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      spatial browser
                    </a>{" "}
                    that uses GPS to retrieve content anchored to their current
                    location. Content discovery is frictionless and orderly. We
                    think the Geo Web can become especially useful as always-on
                    smart devices like smartwatches and smartglasses are widely
                    adopted.
                  </p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="1">
                What is the Geo Web Cadastre?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="1">
                <Card.Body>
                  <p>
                    A <i>cadastre</i> is a register of property showing the
                    extent, value, and ownership of land. This Cadastre
                    interface is your home for viewing, claiming, transferring,
                    and managing digital land parcels on the Geo Web.
                  </p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="2">
                How do I buy Geo Web land? What is partial common ownership?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="2">
                <Card.Body>
                  <p>
                    The Geo Web’s land market is administered under a system
                    called{" "}
                    <a
                      href="https://docs.geoweb.network/concepts/partial-common-ownership"
                      target="_blank"
                      rel="noreferrer"
                    >
                      partial common ownership
                    </a>
                    . It’s a blend between private and communal ownership. Geo
                    Web land parcels are licensed rather than sold outright to
                    market participants.
                  </p>
                  <p>
                    Licensors pay an annual network fee (10% on this testnet)
                    based on their self-determined `For Sale Price` of the
                    parcel. To help make sure parcels aren’t underpriced and
                    “squatted” on, any other market participant can place a bid
                    at or above the current price of the parcel. A bid must be
                    accepted (the licensor is paid their `For Sale Price` and
                    the asset is transferred) or rejected (the licensor pays a
                    penalty equal to 10% of incoming bid value) within 7 days.
                  </p>
                  <p>
                    It might seem a little{" "}
                    <a
                      href="https://www.radicalxchange.org/concepts/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      radical
                    </a>
                    , but we believe that this system creates the right
                    incentives, opportunities, and efficiency to globally scale
                    the Geo Web network without a centralized authority.
                  </p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="3">
                What are network fees used for?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="3">
                <Card.Body>
                  <p>
                    Network fees are used to fund public goods and create
                    positive-sum outcomes.
                  </p>
                  <p>
                    Currently, streamed fees are accumulated in a multi-sig
                    controlled by 5 respected community members. On a quarterly
                    basis (or as treasury accumulation allows), the multi-sig
                    will transfer these funds to matching pools for{" "}
                    <a
                      href="https://wtfisqf.com/?grant=&grant=&grant=&grant=&match=1000"
                      target="_blank"
                      rel="noreferrer"
                    >
                      quadratic funding rounds
                    </a>
                    .
                  </p>
                  <p>
                    As the Geo Web community and governance systems mature,
                    additional public goods funding allocation mechanisms can be
                    experimented with and adopted.
                  </p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="4">
                How do I use the Cadastre?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="4">
                <Card.Body>
                  <p>
                    Use the Cadastre like other modern map interfaces. Zoom and
                    pan across the globe to find points of interest and Geo Web
                    land parcels. When you interact with a land parcel, all of
                    its details will be shown in a panel on the left side of the
                    screen.
                  </p>
                  <p>
                    Click on a shaded polygon on the map to inspect the parcel
                    details. You can edit the parcel and make network payments
                    if you’re the current licensor. You can place a bid if
                    someone else currently licenses the land. You’ll have to
                    fully collateralize your bid and wait up to 7 days before
                    the transfer is effected or your bid is rejected.
                  </p>
                  <p>
                    Click once on an unshaded area of the map to start a new
                    land parcel claim. You set the size and shape of your parcel
                    claim (just rectangles for now).
                  </p>
                  <p>
                    Please be patient with your clicks, transactions, and data
                    loading. Our web3 stack will continue to improve!
                  </p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="5">
                How do I use the Cadastre?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="5">
                <Card.Body>
                  <p>
                    Use the Cadastre UI like other modern map interfaces. Zoom
                    and pan across the globe to find points of interest and Geo
                    Web land parcels. When you interact with a land parcel, all
                    of its details will be shown in a panel on the left side of
                    the screen.
                  </p>

                  <p>
                    Click on a shaded polygon on the map to inspect the parcel
                    details. You can edit the parcel and make network payments
                    if you’re the current licensor. You force a transfer if
                    someone else currently licenses the land. You’ll have to pay
                    them their “For Sale Price” plus any additional network fee
                    prepayments and Ethereum transaction fees.
                  </p>

                  <p>
                    Single click on an unshaded area of the map to start a new
                    land parcel claim. You set the size and shape of your parcel
                    claim (just rectangles for now).
                  </p>

                  <p>
                    Be a patient with your clicks, transactions, and movements
                    :). We’re in active development, and this is
                    blockchain-based: speed isn’t the top priority, yet.
                  </p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="6">
                What can I do with my land parcel?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="6">
                <Card.Body>
                  <p>
                    Currently, landholders can name their parcel, add a URI
                    link, and anchor 3D/AR content in a media gallery. New use
                    cases are added as{" "}
                    <a
                      href="https://github.com/Geo-Web-Project/datamodels"
                      target="_blank"
                      rel="noreferrer"
                    >
                      open-source data models in this repository
                    </a>
                    .
                  </p>
                  <p>
                    The Geo Web leverages{" "}
                    <a
                      href="https://ceramic.network/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ceramic
                    </a>{" "}
                    and{" "}
                    <a href="https://ipfs.io/" target="_blank" rel="noreferrer">
                      IPFS
                    </a>{" "}
                    for its content layer. The Cadastre automatically generates
                    and links a root Ceramic stream for each claimed parcel to
                    manage this linked content.
                  </p>
                  <p>
                    We’ve set up free p2p content pinning and archive
                    functionality (through{" "}
                    <a
                      href="https://web3.storage/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Web3 Storage
                    </a>
                    ) to make this initial experience really simple.
                  </p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="7">
                What are the use cases?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="7">
                <Card.Body>
                  <p>
                    The Geo Web’s protocols are designed to be agnostic and
                    foundational. They’re intended to be narrow-waist protocols
                    to enable innovation above (use cases) and below (hardware,
                    OS, etc.) without changes to the protocols themselves.
                  </p>

                  <p>
                    NFTs, Digital art, games, micro-applications, audio files,
                    and other media can be anchored to specific geolocations to
                    augment the physical environment. This augmentation layer is
                    deterministic and shared for all Geo Web users.{" "}
                    <a
                      href="https://github.com/Geo-Web-Project/datamodels"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Let your imagination run wild with what you could do with
                      digital objects/information persisted in the real world
                    </a>
                    .
                  </p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="8">
                What stage of development is the Geo Web in?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="8">
                <Card.Body>
                  <p>
                    Beta—our contracts are unaudited and subject to change. You
                    use all Geo Web interfaces and contracts at your own risk.
                    You might lose everything.
                  </p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="9">
                Does the Geo Web have its own token?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="9">
                <Card.Body>
                  <p>No.</p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="10">
                Who owns/controls/makes money from the Geo Web?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="10">
                <Card.Body>
                  <p>The Geo Web is a public good, so we all own it.</p>

                  <p>
                    The community multi-sig will have the ability to modify the
                    core infrastructure out of necessity. As the technology and
                    the network mature, we will progressively decentralize this
                    decision-making authority and implement democratic
                    governance systems.
                  </p>
                  <p>
                    The network itself generates funds through its partial
                    common ownership system, but no one person, team, or entity
                    exercises direct control of that cash flow. These funds will
                    be used to fund public goods and generate positive-sum
                    outcomes. We hope lots of people make money (by creating
                    value) on the Geo Web.
                  </p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="11">
                How can I learn more? How can I get involved?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="11">
                <Card.Body>
                  <p>
                    We’re an open org/project. We’re always looking for
                    contributors, feedback, and questions.
                  </p>
                  <p>
                    Jump in our{" "}
                    <a
                      href="https://discord.com/invite/reXgPru7ck"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Discord
                    </a>
                    , post in our{" "}
                    <a
                      href="https://forum.geoweb.network/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Forum
                    </a>
                    , explore our{" "}
                    <a
                      href="https://github.com/Geo-Web-Project"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Github repos
                    </a>
                    , or engage with us on{" "}
                    <a
                      href="https://twitter.com/thegeoweb"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Twitter
                    </a>
                    . Discord, Forum and Github engagement can even earn you{" "}
                    <a
                      href="https://geo-web-project.github.io/sourcecred-instance/#/explorer"
                      target="_blank"
                      rel="noreferrer"
                    >
                      SourceCred-based payouts
                    </a>
                    !
                  </p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
          </Accordion>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default FAQ;
