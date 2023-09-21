import { useState, useEffect } from "react";
import { BigNumber } from "ethers";
import { AssetId } from "caip";
import Modal from "react-bootstrap/Modal";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Spinner from "react-bootstrap/Spinner";
import Container from "react-bootstrap/Container";
import Alert from "react-bootstrap/Alert";
import type { IPCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/IPCOLicenseDiamond";
import GalleryForm from "./GalleryForm";
import { MediaGalleryItem } from "./GalleryForm";
import GalleryDisplayGrid from "./GalleryDisplayGrid";
import { STATE } from "../Map";
import { ParcelInfoProps } from "../cards/ParcelInfo";
import { useMediaGallery } from "../../lib/geo-web-content/mediaGallery";
import { useBundleSettings } from "../../lib/transactionBundleSettings";
import { useSuperTokenBalance } from "../../lib/superTokenBalance";
import { useSafe } from "../../lib/safe";
import { ZERO_ADDRESS } from "../../lib/constants";

export type GalleryModalProps = ParcelInfoProps & {
  show: boolean;
  licenseDiamondContract: IPCOLicenseDiamond | null;
};

function GalleryModal(props: GalleryModalProps) {
  const {
    smartAccount,
    signer,
    paymentToken,
    licenseDiamondContract,
    show,
    setInteractionState,
  } = props;
  const handleClose = () => {
    setInteractionState(STATE.PARCEL_SELECTED);
  };

  const mediaGalleryItems = useMediaGallery();
  const { relayTransaction, simulateSafeTx, estimateTransactionBundleFees } =
    useSafe(smartAccount?.safe ?? null);
  const { superTokenBalance } = useSuperTokenBalance(
    smartAccount?.safe ? smartAccount.address : "",
    paymentToken.address
  );
  const bundleSettings = useBundleSettings();

  const [selectedMediaGalleryItemIndex, setSelectedMediaGalleryItemIndex] =
    useState<number | null>(null);
  const [newMediaGallery, setNewMediaGallery] = useState<
    MediaGalleryItem[] | null
  >(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showAlert, setShowAlert] = useState<boolean>(false);

  useEffect(() => {
    if (mediaGalleryItems) {
      setNewMediaGallery(mediaGalleryItems);
    }
  }, [mediaGalleryItems]);

  useEffect(() => {
    setIsSaved(false);
  }, [newMediaGallery]);

  const spinner = (
    <span className="spinner-border" role="status">
      <span className="visually-hidden">Loading...</span>
    </span>
  );

  const isLoading = newMediaGallery == null;

  const commitNewRoot = async () => {
    // if (!ceramic?.did) {
    //   throw Error("Could not find Ceramic DID");
    // }
    // if (!newMediaGallery || !mediaGalleryItems) {
    //   throw Error("Coul not find Media Gallery");
    // }
    // const assetId = new AssetId({
    //   chainId: `eip155:${NETWORK_ID}`,
    //   assetName: {
    //     namespace: "erc721",
    //     reference: licenseAddress.toLowerCase(),
    //   },
    //   tokenId: BigNumber.from(selectedParcelId).toString(),
    // });
    // const ownerDID = ceramic.did.parent;
    // let rootCid = await geoWebContent.raw.resolveRoot({
    //   ownerDID,
    //   parcelId: assetId,
    // });
    // const mediaGallery = await geoWebContent.raw.get(rootCid, "/mediaGallery", {
    //   schema: "MediaGallery",
    // });
    // if (!mediaGallery) {
    //   rootCid = await geoWebContent.raw.putPath(rootCid, "/mediaGallery", [], {
    //     parentSchema: "ParcelRoot",
    //     pin: true,
    //   });
    // }
    // let newRoot;
    // for (let i = 0; i < newMediaGallery.length; i++) {
    //   newRoot = await geoWebContent.raw.putPath(
    //     newRoot ?? rootCid,
    //     `/mediaGallery/${i}`,
    //     newMediaGallery[i],
    //     {
    //       parentSchema: "MediaGallery",
    //     }
    //   );
    // }
    // if (newMediaGallery.length < mediaGalleryItems.length) {
    //   const itemsDeleted = mediaGalleryItems.length - newMediaGallery.length;
    //   for (
    //     let i = mediaGalleryItems.length - 1;
    //     i >= mediaGalleryItems.length - itemsDeleted;
    //     i--
    //   ) {
    //     newRoot = await geoWebContent.raw.deletePath(
    //       newRoot ?? rootCid,
    //       `/mediaGallery/${i}`
    //     );
    //   }
    // }
    // if (!newRoot) {
    //   throw Error("Could not updload parcel content");
    // }
    // const mediaGalleryPath = await geoWebContent.raw.get(
    //   newRoot,
    //   "/mediaGallery",
    //   { schema: "MediaGallery" }
    // );
    // newRoot = await geoWebContent.raw.putPath(
    //   newRoot,
    //   `/mediaGallery`,
    //   mediaGalleryPath,
    //   {
    //     parentSchema: "ParcelRoot",
    //     pin: true,
    //   }
    // );
    // const contentHash = await geoWebContent.raw.commit(newRoot);
    // return contentHash;
  };

  const updateMediaGallery = async () => {
    if (!licenseDiamondContract) {
      throw new Error("Could not find licenseDiamondContract");
    }

    setIsSaving(true);

    try {
      const contentHash = "0x0"; // await commitNewRoot();

      if (smartAccount?.safe) {
        let wrap;
        const metaTransactions = [];
        const safeBalance = await smartAccount.safe.getBalance();
        const wrapAmount =
          bundleSettings.isSponsored &&
          !bundleSettings.noWrap &&
          (bundleSettings.wrapAll ||
            BigNumber.from(bundleSettings.wrapAmount).gt(safeBalance)) &&
          safeBalance.gt(0)
            ? safeBalance.toString()
            : bundleSettings.isSponsored &&
              !bundleSettings.noWrap &&
              BigNumber.from(bundleSettings.wrapAmount).gt(0) &&
              safeBalance.gt(0)
            ? BigNumber.from(bundleSettings.wrapAmount).toString()
            : "";

        if (bundleSettings.isSponsored && wrapAmount && safeBalance.gt(0)) {
          wrap = await paymentToken.upgrade({
            amount: wrapAmount,
          }).populateTransactionPromise;
        }

        if (wrap?.to && wrap?.data) {
          metaTransactions.push({
            to: wrap.to,
            value: wrapAmount,
            data: wrap.data,
          });
        }

        const editContentHashData =
          licenseDiamondContract.interface.encodeFunctionData(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            "editContentHash(bytes)",
            [contentHash]
          );

        const editContentHashTransaction = {
          to: licenseDiamondContract.address,
          data: editContentHashData,
          value: "0",
        };
        metaTransactions.push(editContentHashTransaction);

        const gasUsed = await simulateSafeTx(metaTransactions);
        const transactionFeesEstimate = await estimateTransactionBundleFees(
          gasUsed
        );
        await relayTransaction(metaTransactions, {
          isSponsored: bundleSettings.isSponsored,
          gasToken:
            bundleSettings.isSponsored &&
            bundleSettings.noWrap &&
            superTokenBalance.lt(transactionFeesEstimate ?? 0)
              ? ZERO_ADDRESS
              : bundleSettings.isSponsored &&
                (BigNumber.from(bundleSettings.wrapAmount).eq(0) ||
                  superTokenBalance.gt(transactionFeesEstimate ?? 0))
              ? paymentToken.address
              : ZERO_ADDRESS,
        });
      } else {
        if (!signer) {
          throw new Error("Could not find signer");
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const txn = await licenseDiamondContract
          .connect(signer)
          .editContentHash(contentHash);

        await txn.wait();
      }

      setIsSaving(false);
      setIsSaved(true);
      handleClose();
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  const handleExitIntent = () => {
    // @ts-ignore
    BigInt.prototype.toJSON = function () {
      return this.toString();
    };

    if (
      isSaved ||
      JSON.stringify(mediaGalleryItems) === JSON.stringify(newMediaGallery)
    ) {
      handleClose();
    } else {
      setShowAlert(true);
    }
  };

  return (
    <Modal
      show={show}
      backdrop="static"
      centered
      keyboard={false}
      size="xl"
      onHide={handleClose}
      contentClassName="bg-dark"
    >
      <Alert
        show={showAlert}
        variant="info"
        className="position-absolute start-50 top-50 translate-middle"
        style={{ zIndex: 10 }}
      >
        <div className="mb-4">
          Your changes will not be saved. Are you sure?
        </div>
        <div className="d-flex justify-content-end gap-2">
          <Button
            variant="info"
            className="px-5"
            onClick={() => setShowAlert(false)}
          >
            No
          </Button>
          <Button variant="primary" className="px-5" onClick={handleClose}>
            Yes
          </Button>
        </div>
      </Alert>
      <Modal.Header className="p-2 bg-dark border-0">
        <Container className="p-2">
          <Row>
            <Col xs="8" sm="11">
              <Modal.Title className="text-primary">Media Gallery</Modal.Title>
            </Col>
            <Col xs="4" sm="1" className="text-end">
              <Button variant="link" size="sm" onClick={handleExitIntent}>
                <Image src="close.svg" />
              </Button>
            </Col>
          </Row>
        </Container>
      </Modal.Header>
      {isLoading ? (
        <Modal.Body className="bg-dark p-5 text-light text-center">
          {spinner}
        </Modal.Body>
      ) : (
        <>
          <Modal.Body className="bg-dark pt-0 px-3 px-sm-4 text-light">
            <p>
              The Media Gallery is a simple carousel viewing experience on the{" "}
              <a href="https://geoweb.app" target="_blank" rel="noreferrer">
                spatial browser
              </a>
              . GLB and USDZ (iOS only) files can be viewed in AR on compatible
              devices.
            </p>
            <Card
              border="secondary"
              className="bg-dark mt-4 mb-2 p-2 p-sm-3 text-center rounded-4"
            >
              <small
                className="position-absolute bg-dark px-1 text-secondary"
                style={{ left: 25, top: -12 }}
              >
                {" "}
                Media Upload
              </small>
              <GalleryForm
                newMediaGallery={newMediaGallery}
                setNewMediaGallery={setNewMediaGallery}
                selectedMediaGalleryItemIndex={selectedMediaGalleryItemIndex}
                setSelectedMediaGalleryItemIndex={
                  setSelectedMediaGalleryItemIndex
                }
                {...props}
              />
              <GalleryDisplayGrid
                newMediaGallery={newMediaGallery}
                setNewMediaGallery={setNewMediaGallery}
                selectedMediaGalleryItemIndex={selectedMediaGalleryItemIndex}
                setSelectedMediaGalleryItemIndex={
                  setSelectedMediaGalleryItemIndex
                }
                {...props}
              />
            </Card>
            <Row className="text-end justify-content-end">
              <Col xs="6" sm="2">
                <Button
                  variant="danger"
                  disabled={isSaving || showAlert}
                  onClick={handleExitIntent}
                  className="w-100"
                >
                  Cancel
                </Button>
              </Col>
              <Col xs="6" sm="2">
                <Button
                  variant="primary"
                  disabled={isSaving || showAlert}
                  onClick={updateMediaGallery}
                  className="w-100"
                >
                  {isSaving ? (
                    <Spinner
                      size="sm"
                      animation="border"
                      role="status"
                      variant="light"
                    >
                      <span className="visually-hidden">Loading...</span>
                    </Spinner>
                  ) : (
                    "Save"
                  )}
                </Button>
              </Col>
            </Row>
          </Modal.Body>
        </>
      )}
    </Modal>
  );
}

export default GalleryModal;
