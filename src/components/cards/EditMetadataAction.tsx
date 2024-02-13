import { useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import { ethers, BigNumber } from "ethers";
import Image from "react-bootstrap/Image";
import { PAYMENT_TOKEN } from "../../lib/constants";
import { ParcelInfoProps } from "./ParcelInfo";
import InfoTooltip from "../InfoTooltip";
import { STATE } from "../Map";
import WrapModal from "../wrap/WrapModal";
import PerformButton from "../PerformButton";
import { BasicProfile } from "../../lib/geo-web-content/basicProfile";
import { useMediaQuery } from "../../lib/mediaQuery";

export type EditMetadataActionProps = ParcelInfoProps & {
  basicProfile: BasicProfile;
  signer: ethers.Signer;
  setShouldBasicProfileUpdate: React.Dispatch<React.SetStateAction<boolean>>;
};

export type ActionData = {
  parcelName?: string;
  parcelWebContentURI?: string;
  didFail?: boolean;
  isActing?: boolean;
  errorMessage?: string;
};

export function EditMetadataAction(props: EditMetadataActionProps) {
  const {
    signer,
    registryContract,
    w3Client,
    selectedParcelId,
    basicProfile,
    setShouldBasicProfileUpdate,
    setShouldRefetchParcelsData,
    setInteractionState,
  } = props;

  const [showWrapModal, setShowWrapModal] = useState(false);
  const [actionData, setActionData] = useState<ActionData>({
    parcelName: basicProfile?.name,
    parcelWebContentURI: basicProfile?.external_url,
    didFail: false,
    isActing: false,
    errorMessage: "",
  });

  const { parcelName, parcelWebContentURI, isActing } = actionData;

  const { isMobile, isTablet } = useMediaQuery();

  const handleWrapModalOpen = () => setShowWrapModal(true);
  const handleWrapModalClose = () => setShowWrapModal(false);

  const isParcelNameInvalid = parcelName ? parcelName.length > 150 : false;
  const hasMetatadataChanged =
    parcelName !== basicProfile.name ||
    parcelWebContentURI !== basicProfile.external_url;
  const isURIInvalid = parcelWebContentURI
    ? /^(http|https|ipfs|ipns):\/\/[^ "]+$/.test(parcelWebContentURI) ===
        false || parcelWebContentURI.length > 150
    : false;
  const isInvalid = isParcelNameInvalid || isURIInvalid;

  function updateActionData(updatedValues: ActionData) {
    function _updateData(updatedValues: ActionData) {
      return (prevState: ActionData) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setActionData(_updateData(updatedValues));
  }

  async function generateTokenURI() {
    let tokenURI = "ipfs://";
    const basicProfile = { name: "", external_url: "" };

    if (parcelName) {
      basicProfile["name"] = parcelName;
    }
    if (parcelWebContentURI) {
      basicProfile["external_url"] = parcelWebContentURI;
    }

    try {
      if (w3Client) {
        const basicProfileBlob = new Blob([JSON.stringify(basicProfile)]);
        const basicProfileCID = await w3Client.uploadFile(basicProfileBlob);

        tokenURI = `${tokenURI}${basicProfileCID}`;
      } else {
        throw Error("w3Client is not instantiated");
      }
    } catch (err) {
      console.error(err);
      throw Error("Could not update parcel content, please try again later");
    }

    return tokenURI;
  }

  const updateMetadata = async () => {
    try {
      updateActionData({ isActing: true, didFail: false });

      const tokenURI = await generateTokenURI();
      const tx = await registryContract
        .connect(signer)
        .updateTokenURI(BigNumber.from(selectedParcelId), tokenURI);

      await tx.wait();

      if (basicProfile?.name !== parcelName) {
        setShouldRefetchParcelsData(true);
      }

      updateActionData({ isActing: false });
      setShouldBasicProfileUpdate(true);
      setInteractionState(STATE.PARCEL_SELECTED);
    } catch (err) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      if (
        (err as any)?.code !== "TRANSACTION_REPLACED" ||
        (err as any).cancelled
      ) {
        console.error(err);
        updateActionData({
          errorMessage: (err as any).reason
            ? (err as any).reason.replace("execution reverted: ", "")
            : (err as Error).message,
          didFail: true,
          isActing: false,
        });
        return;
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }
  };

  return (
    <>
      <Card
        border={isMobile || isTablet ? "dark" : "secondary"}
        text="white"
        className="bg-dark"
      >
        <Card.Header className="d-none d-lg-block fs-3">
          Edit Metadata
        </Card.Header>

        <Card.Body className="p-1 p-lg-3">
          <Form>
            <Form.Group>
              <Form.Text className="text-primary mb-1">Parcel Name</Form.Text>
              <InfoTooltip
                content={
                  <div style={{ textAlign: "left" }}>
                    Optional - Add a name to your parcel for all visitors to
                    see.
                  </div>
                }
                target={
                  <Image
                    style={{
                      width: "1.1rem",
                      marginLeft: "4px",
                    }}
                    src="info.svg"
                  />
                }
              />
              <Form.Control
                isInvalid={isParcelNameInvalid}
                className="bg-dark text-light mt-1"
                type="text"
                placeholder="Parcel Name"
                aria-label="Parcel Name"
                aria-describedby="parcel-name"
                value={parcelName ?? ""}
                disabled={isActing}
                onChange={(e) =>
                  updateActionData({ parcelName: e.target.value })
                }
              />
              {isParcelNameInvalid ? (
                <Form.Control.Feedback type="invalid">
                  Parcel name cannot be longer than 150 characters
                </Form.Control.Feedback>
              ) : null}
              <br />
              <Form.Text className="text-primary mb-1">Content Link</Form.Text>
              <InfoTooltip
                content={
                  <div style={{ textAlign: "left" }}>
                    Optional - Link content to your parcel via URI. This is
                    displayed in an iframe on the{" "}
                    <a
                      href="https://geoweb.app/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Geo Web spatial browser
                    </a>
                    .
                  </div>
                }
                target={
                  <Image
                    style={{
                      width: "1.1rem",
                      marginLeft: "4px",
                    }}
                    src="info.svg"
                  />
                }
              />
              <Form.Control
                isInvalid={isURIInvalid}
                className="bg-dark text-light mt-1"
                type="text"
                placeholder="URI (http://, https://, ipfs://, ipns://)"
                aria-label="Web Content URI"
                aria-describedby="web-content-uri"
                value={parcelWebContentURI ?? ""}
                disabled={isActing}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                onChange={(e) =>
                  updateActionData({ parcelWebContentURI: e.target.value })
                }
              />
              {isURIInvalid ? (
                <Form.Control.Feedback type="invalid">
                  Web content URI must be one of
                  (http://,https://,ipfs://,ipns://) and less than 150
                  characters
                </Form.Control.Feedback>
              ) : null}
            </Form.Group>
            <br className="d-lg-none" />
            <div className="d-none d-lg-block">
              <hr className="action-form_divider" />
            </div>
            <br />
            <>
              <Button
                variant="secondary"
                className="w-100 mb-3"
                onClick={handleWrapModalOpen}
              >
                {`Wrap ETH to ${PAYMENT_TOKEN}`}
              </Button>
              <PerformButton
                isDisabled={isActing || isInvalid || !hasMetatadataChanged}
                isActing={isActing ?? false}
                buttonText={"Submit"}
                performAction={updateMetadata}
                isAllowed={true}
              />
            </>
          </Form>

          <br />
        </Card.Body>
      </Card>

      {showWrapModal && (
        <WrapModal
          show={showWrapModal}
          handleClose={handleWrapModalClose}
          {...props}
        />
      )}
    </>
  );
}

export default EditMetadataAction;
