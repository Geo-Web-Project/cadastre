import Image from "react-bootstrap/Image";
import Button from "react-bootstrap/Button";
import React from "react";
import { useMultiAuth } from "@ceramicstudio/multiauth";

function HomeContent() {
  return (
    <div style={{ color: "white", lineHeight: "160%" }} className="px-3">
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
            `Network Fees` are used to fund public goods (not a centralized
            corporation). You have a say in how these funds are used!
          </li>
        </ol>
      </div>

      <div className="mb-5">
        <h3 className="mb-3">
          The Geo Web is a geospatial successor to the World Wide Web.
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
      }}
    >
      <div
        style={{ paddingTop: "128px", gap: "24px" }}
        className="d-flex flex-column flex-md-row justify-content-between align-items-center px-2"
      >
        <HomeContent />
        <div className="px-3 mb-5 d-flex align-items-center flex-column">
          <img className="mb-2" src="/arMedia.gif" alt="arMedia" />
          <span style={{ fontSize: "12px", color: "white" }}>
            Browsing an AR Media Gallery on the Geo Web
          </span>
        </div>
      </div>
      <div className="d-flex flex-column align-items-center">
        <Button
          variant="primary"
          className="text-light font-weight-bold border-dark mx-auto fit-content"
          style={{ padding: "16px 18px" }}
          disabled={status === "connecting"}
          onClick={connectWallet}
        >
          <Image src="vector.png" width="40" style={{ marginRight: 20 }} />
          <span>Get Started</span>
        </Button>
        <img
          src="/claming.gif"
          className="mt-5"
          style={{ maxWidth: "80%" }}
          alt=""
        />
        <span style={{ fontSize: "12px", marginTop: "18px", color: "white" }}>
          Claiming a land parcel in New York City on the Geo Web
        </span>
      </div>
    </div>
  );
}

export default Home;
