import Image from "react-bootstrap/Image";
import Button from "react-bootstrap/Button";
import React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
//import BetaAgreementModal from "./BetaAgreementModal";

function HomeContent() {
  return (
    <div style={{ color: "white", lineHeight: "160%" }} className="px-3">
      {/* only show warning on small screens(mobile) */}
      <div
        className="d-sm-none bg-warning mb-3"
        style={{ borderRadius: "20px" }}
      >
        <Row className="py-3 align-items-center">
          <Col xs={2} className={"text-center ps-3"}>
            <Image src="warning.svg" />
          </Col>
          <Col xs={10} className={"pe-4"}>
            <div className="text-black fs-6">
              The Geo Web Cadastre is not mobile-friendly yet. Please switch to your desktop.
            </div>
          </Col>
        </Row>
      </div>
      <div className="mb-5">
        <h3 className="mb-3">What is the Geo Web?</h3>
        <p>
          The Geo Web is a fair and productive property rights system for
          anchoring digital media to physical locations. It creates a shared
          augmented reality layer of the metaverse.
        </p>
      </div>

      <div className="mb-5">
        <h3 className="mb-3">
          The Geo Web uses partial common ownership to administer its land
          market and fund public goods:
        </h3>
        <ol>
          <li className="py-1">
            Geo Web land parcels are NFTs that correspond to physical world
            locations.
          </li>
          <li className="py-1">
            All land parcels have a publicly triggerable `For Sale Price` set by
            the current licensor.
          </li>
          <li className="py-1">
            The current licensor must pay an annual `Network Fee` equal to 10%
            of their current `For Sale Price` to maintain their rights.
          </li>
          <li className="py-1">
            `Network Fees` are used to fund public goods and prosocial outcomes.
            Initially, funds are being stewarded by a multi-sig and will be used
            to fund matching pools for{" "}
            <a href="https://wtfisqf.com" target={"_blank"}>
              quadratic funding rounds
            </a>
            .
          </li>
        </ol>
      </div>

      <div className="mb-5">
        <h3 className="mb-3">
          The Geo Web is a geospatial extension of the World Wide Web.
        </h3>
        <p>
          Landholders can anchor NFTs, AR/VR, images, video, audio, data, and
          more within the geospatial bounds of their parcel as part of an open
          ecosystem (think of parcels like three-dimensional websites). Users
          naturally discover content anchored to Geo Web parcels with Spatial
          Browsers that navigate with geolocation instead of URLs.
        </p>
      </div>
    </div>
  );
}

function Home({
  connectWallet,
  status,
}: {
  connectWallet: () => void;
  status: string;
}) {
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
        minHeight: "100vh",
      }}
    >
      {/*<BetaAgreementModal />*/}
      <div
        style={{ paddingTop: "128px", gap: "24px" }}
        className="d-flex flex-column flex-md-row justify-content-between align-items-center px-2"
      >
        <HomeContent />
        <div className="px-3 mb-5 d-flex align-items-center flex-column">
          <Image className="mb-2" src="/arMedia.gif" alt="arMedia" />
          <span style={{ fontSize: "12px", color: "white" }}>
            Browsing an AR Media Gallery on the Geo Web
          </span>
        </div>
      </div>
      <div className="d-flex flex-column align-items-center">
        <Button
          variant="primary"
          className="text-light fw-bold border-dark mx-auto fit-content"
          style={{ padding: "16px 18px" }}
          disabled={status === "connecting"}
          onClick={connectWallet}
        >
          <Image src="vector.png" width="40" style={{ marginRight: 20 }} />
          <span>Get Started</span>
        </Button>
      </div>
    </div>
  );
}

export default Home;
