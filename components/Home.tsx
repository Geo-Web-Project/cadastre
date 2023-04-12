import { useEffect } from "react";
import { useSigner } from "wagmi";
import { CeramicClient } from "@ceramicnetwork/http-client";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import BetaAgreementModal from "./BetaAgreementModal";

type HomeProps = {
  ceramic: CeramicClient | null;
  isFirstVisit: boolean;
  setIsFirstVisit: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function Home(props: HomeProps) {
  const { ceramic, isFirstVisit, setIsFirstVisit } = props;

  const { data: signer } = useSigner();

  const updateVisitStatus = () => {
    localStorage.setItem("gwCadastreAlreadyVisited", "true");
    setIsFirstVisit(false);
  };

  useEffect(() => {
    if (signer && ceramic?.did) {
      updateVisitStatus();
    }
  }, [signer, ceramic]);

  const HomeContent = (
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

      <>
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
      </>
    </div>
  );

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
        minHeight: "100vh",
        minWidth: "100vw",
      }}
    >
      {!isFirstVisit ? (
        <div className="position-absolute top-50 start-50 translate-middle">
          <Spinner animation="border" role="status" variant="light">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <>
          <BetaAgreementModal />
          <div className="d-flex align-items-center">
            <Button
              variant="primary"
              className="text-light fw-bold border-dark mx-auto fs-5 my-2 px-5 py-3"
              onClick={updateVisitStatus}
            >
              <span>Launch App</span>
            </Button>
          </div>
          <div
            style={{ gap: "24px" }}
            className="d-flex flex-column flex-md-row justify-content-between align-items-center px-2"
          >
            {HomeContent}
          </div>
        </>
      )}
    </div>
  );
}
