import * as React from "react";
import Button from "react-bootstrap/Button";
import Accordion from "react-bootstrap/Accordion";
import AccordionContext from "react-bootstrap/AccordionContext";
import Card from "react-bootstrap/Card";
import { useAccordionToggle } from "react-bootstrap/AccordionToggle";
import Modal from "react-bootstrap/Modal";
import { PAYMENT_TOKEN_FAUCET_URL } from "../lib/constants";
import Web3 from "web3";
import BN from "bn.js";
import Image from "react-bootstrap/Image";

function ContextAwareToggle({ children, eventKey, callback }) {
  const currentEventKey = React.useContext(AccordionContext);

  const decoratedOnClick = useAccordionToggle(
    eventKey,
    () => callback && callback(eventKey)
  );

  const isCurrentEventKey = currentEventKey === eventKey;

  return (
    <Accordion.Toggle
      className="font-weight-bold border-dark"
      as={Card.Header}
      onClick={decoratedOnClick}
      style={{ fontSize: "1.25em" }}
    >
      {isCurrentEventKey ? "-" : "+"} {children}
    </Accordion.Toggle>
  );
}

function FAQ({ account, paymentTokenContract, adminAddress }) {
  const [show, setShow] = React.useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  function _mintToken() {
    paymentTokenContract.mockMint(account, Web3.utils.toWei("1000"), {
      from: account,
    });
  }

  function _approve() {
    paymentTokenContract.approve(
      adminAddress,
      new BN(2).pow(new BN(256)).subn(1),
      { from: account }
    );
  }

  return (
    <>
      <Button
        target="_blank"
        rel="noreferrer"
        variant="outline-primary"
        className="text-light font-weight-bold border-dark"
        style={{ height: "100px", width: "100px" }}
        onClick={handleShow}
      >
        <Image src="help.svg" /> Help
      </Button>
      <Modal show={show} size="lg" onHide={handleClose}>
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
                    Users interact with Geo Web content through a browser on a
                    smart device that uses geolocation to retrieve content
                    relevant to the user’s physical environment. Content
                    discovery is frictionless and orderly. We think the Geo Web
                    can become especially useful as we transition to more
                    always-on smart devices like smartwatches and smartglasses.
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
                    extent, value, and ownership of land. This Cadastre UI is
                    your home for viewing, claiming, transferring, and managing
                    digital land parcels on the Geo Web.
                  </p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="2">
                How do I buy Geo Web land? What is SALSA?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="2">
                <Card.Body>
                  <p>
                    The Geo Web’s land market is administered under a system
                    called <i>Self-Assessed Licenses Sold via Auction</i>{" "}
                    (SALSA). It’s a blend between private and collective
                    ownership. Land parcels are licensed rather than sold
                    outright to market participants.
                  </p>
                  <p>
                    Licensors pay an annual 10% network fee (this rate will be
                    studied and adjusted over time) based on their own public,
                    self-assessed value of the parcel. To help make sure parcels
                    aren’t underpriced and “squatted” on, any other market
                    participant can force transfer of a land parcel by paying
                    the current licensor their self-assessed value.{" "}
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
                    , but we believe this system that creates the right
                    incentives, opportunities, and efficiency to globally scale
                    the Geo Web network without a centralized authority.{" "}
                  </p>
                  <p>
                    All management functions of Geo Web land can be executed
                    from this UI.
                  </p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="3">
                What are SALSA fees used for?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="3">
                <Card.Body>
                  <p>
                    This is just a testnet, so the currency currently used to
                    transact isn't worth anything.
                  </p>
                  <p>
                    When the Geo Web moves to a production network, network fees
                    will be transparently allocated to incentivize
                    permissionless, positive-sum value creation on the network.
                    SALSA funds provide the opportunity to reward everything
                    from core protocol development to content creation to
                    onboarding new landowners to simply being an active user.
                    This is intended to be managed through one or more
                    decentralized autonomous organizations (DAOs).
                  </p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="4">
                What are the requirements for interacting with the Cadastre?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="4">
                <Card.Body>
                  <ul>
                    <li>A modern web browser</li>
                    <li>
                      <a
                        href="https://metamask.io/download.html"
                        target="_blank"
                        rel="noreferrer"
                      >
                        The MetaMask web3 plugin
                      </a>{" "}
                      & an active account (other wallets and forms of identity
                      to come)
                    </li>
                    <li>Connection to the Kovan test network in your wallet</li>
                    <li>
                      <a href={PAYMENT_TOKEN_FAUCET_URL}>Kovan ETH</a> (testnet
                      token—no value) to pay for gas fees
                    </li>
                    <li>
                      <a href="#" onClick={_mintToken}>
                        Kovan GEO
                      </a>{" "}
                      (testnet token—no value)
                    </li>
                    <li>
                      <a href="#" onClick={_approve}>
                        Authorize the Cadastre to interact with your GEO
                      </a>
                    </li>
                  </ul>
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
                What are the use cases?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="6">
                <Card.Body>
                  <p>
                    The Geo Web’s protocols are designed to be agnostic and
                    foundational. They’re intended to be narrow-waist protocols
                    to enable innovation above (use cases) and below (hardware,
                    OS, etc.) without changes to the protocols themselves.
                  </p>

                  <p>
                    Digital art, games, micro-applications, audio files, and
                    other media can be anchored to specific geolocations to
                    augment the physical environment. This augmentation layer is
                    deterministic and shared for all Geo Web users. Let your
                    imagination run wild with what you could do with digital
                    objects/information persisted in the real world.
                  </p>

                  <p>
                    A simple, post-COVID application might be a restaurant
                    anchoring their digital menu to their location rather than
                    using a QR Code to deliver it.
                  </p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="7">
                What stage of development is the Geo Web in?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="7">
                <Card.Body>
                  <p>
                    We are actively building the beta version of the Geo Web
                    smart contracts, Cadastre, and browsers. The actions and use
                    cases that you build on this testnet will help make the
                    product better and inform our roadmap. So, let it rip! Hit
                    us up if you have feedback at{" "}
                    <a href="mailto:info@geoweb.network">info@geoweb.network</a>
                    .
                  </p>

                  <p>
                    Note: Even though the Geo Web is on testnet, it{" "}
                    <i>can work</i> for real world use cases. The economic
                    incentives just aren’t there to keep the market in balance.
                  </p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="8">
                Does the Geo Web have its own crypto/utility token?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="8">
                <Card.Body>
                  <p>
                    For this Kovan testnet application, we created a ERC-20
                    token, GEO. There are currently no limits on its supply and
                    it is only useful for transacting on the Geo Web Cadastre.
                    You can claim more kGEO{" "}
                    <a href="#" onClick={_mintToken}>
                      here
                    </a>
                    . Kovan gas fees require kETH (
                    <a href={PAYMENT_TOKEN_FAUCET_URL}>claim here</a>).
                  </p>

                  <p>
                    We’re actively evaluating our token needs for production: we
                    may launch our own token, use ETH, a stablecoin, or a Layer
                    2 solution like xDAI. We’re more focused on the user
                    experience and tradeoffs in complexity over creating our own
                    token.
                  </p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="9">
                Who owns/controls/makes money from the Geo Web?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="9">
                <Card.Body>
                  <p>
                    Depending on how you look at things it’s either no one,
                    everyone, or the network itself.
                  </p>

                  <p>
                    The Geo Web is envisioned as an open-source public good
                    network. Currently, our small team has the keys to all of
                    the smart contracts out of necessity. As the technology and
                    the network matures, we will progressively decentralize the
                    decision making authority. Our goal is to “Exit to
                    Community” at which time, all Geo Web governance will be
                    handled through democratic (for financial decisions) and
                    decentralized (for technical) processes.
                  </p>

                  <p>
                    The network itself will generate funds through its SALSA
                    system, but no one person, team, or entity will have control
                    of that cash flow. We hope lots of people make money (by
                    creating value) on the Geo Web.
                  </p>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
            <Card className="bg-transparent border-dark text-light">
              <ContextAwareToggle eventKey="10">
                THIS IS AWESOME! How can I learn more? How can I get involved?
              </ContextAwareToggle>
              <Accordion.Collapse eventKey="10">
                <Card.Body>
                  <p>
                    Yeah it is! We’re always looking for contributors, feedback,
                    and questions.
                  </p>

                  <p>
                    Hit us up at{" "}
                    <a href="mailto:info@geoweb.network">info@geoweb.network</a>
                    , jump in on{" "}
                    <a
                      href="https://github.com/Geo-Web-Project"
                      target="_blank"
                      rel="noreferrer"
                    ></a>
                    our Github organization, or even{" "}
                    <a
                      href="http://bit.ly/geowebcalendly"
                      target="_blank"
                      rel="noreferrer"
                    >
                      schedule a call with us
                    </a>
                    .
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
