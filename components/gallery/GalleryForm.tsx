/* eslint-disable import/no-unresolved */
import * as React from "react";
import { BigNumber } from "ethers";
import BN from "bn.js";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import InputGroup from "react-bootstrap/InputGroup";
import type { MediaObject, Encoding } from "@geo-web/types";
import { AssetId } from "caip";
import { CID } from "multiformats/cid";
import { GalleryModalProps } from "./GalleryModal";
import {
  galleryFileFormats,
  getFormat,
  getFormatCS,
} from "./GalleryFileFormat";
import { useFirebase } from "../../lib/Firebase";
import { uploadFile } from "@web3-storage/upload-client";
import { fromValueToRate } from "../../lib/utils";
import { useBundleSettings } from "../../lib/transactionBundleSettings";
import { useSafe } from "../../lib/safe";
import { useSuperTokenBalance } from "../../lib/superTokenBalance";
import { useMediaQuery } from "../../lib/mediaQuery";
import { NETWORK_ID, ZERO_ADDRESS } from "../../lib/constants";

interface MediaGalleryItem {
  name?: string;
  content?: string;
  encodingFormat?: string;
}

export type GalleryFormProps = GalleryModalProps & {
  mediaGalleryItems: MediaObject[];
  selectedMediaGalleryItemIndex: number | null;
  shouldMediaGalleryUpdate: boolean;
  setSelectedMediaGalleryItemIndex: React.Dispatch<
    React.SetStateAction<number | null>
  >;
  setShouldMediaGalleryUpdate: React.Dispatch<React.SetStateAction<boolean>>;
};

function GalleryForm(props: GalleryFormProps) {
  const {
    licenseAddress,
    selectedParcelId,
    geoWebContent,
    w3InvocationConfig,
    ceramic,
    mediaGalleryItems,
    selectedMediaGalleryItemIndex,
    shouldMediaGalleryUpdate,
    setSelectedMediaGalleryItemIndex,
    setShouldMediaGalleryUpdate,
    setRootCid,
    smartAccount,
    signer,
    licenseDiamondContract,
    paymentToken,
    perSecondFeeDenominator,
    perSecondFeeNumerator,
    existingForSalePrice,
  } = props;

  const [detectedFileFormat, setDetectedFileFormat] = React.useState(null);
  const [fileFormat, setFileFormat] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [didFail, setDidFail] = React.useState(false);
  const [mediaGalleryItem, setMediaGalleryItem] =
    React.useState<MediaGalleryItem>({});

  const { firebasePerf } = useFirebase();
  const { isMobile } = useMediaQuery();
  const { relayTransaction, simulateSafeTx, estimateTransactionBundleFees } =
    useSafe(smartAccount?.safe ?? null);
  const { superTokenBalance } = useSuperTokenBalance(
    smartAccount?.safe ? smartAccount.address : "",
    paymentToken.address
  );
  const bundleSettings = useBundleSettings();

  React.useEffect(() => {
    if (selectedMediaGalleryItemIndex === null) {
      return;
    }

    setFileFormat(
      mediaGalleryItems[selectedMediaGalleryItemIndex].encodingFormat
    );
    setMediaGalleryItem({
      name: mediaGalleryItems[selectedMediaGalleryItemIndex].name,
      content:
        mediaGalleryItems[selectedMediaGalleryItemIndex].content.toString(),
      encodingFormat:
        mediaGalleryItems[selectedMediaGalleryItemIndex].encodingFormat,
    });
  }, [selectedMediaGalleryItemIndex]);

  React.useEffect(() => {
    if (isSaving && !shouldMediaGalleryUpdate) {
      setIsSaving(false);
      clearForm();
    }
  }, [shouldMediaGalleryUpdate]);

  function updateMediaGalleryItem(updatedValues: MediaGalleryItem) {
    function _updateData(updatedValues: MediaGalleryItem) {
      return (prevState: MediaGalleryItem) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setMediaGalleryItem(_updateData(updatedValues));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function updateContentUrl(event: React.ChangeEvent<any>) {
    const cid = event.target.value;

    if (!cid || cid.length == 0) {
      updateMediaGalleryItem({
        content: undefined,
      });

      setDetectedFileFormat(null);
      setFileFormat(null);

      return;
    }

    updateMediaGalleryItem({
      content: cid,
      encodingFormat: fileFormat ?? undefined,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function captureFile(event: React.ChangeEvent<any>) {
    event.persist();
    event.stopPropagation();
    event.preventDefault();

    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setIsUploading(true);

    const format = getFormat(file.name);
    const { encoding } = format;
    setFileFormat(encoding ?? null);

    // Upload to Web3 storage
    const added = await uploadFile(w3InvocationConfig, file);

    updateMediaGalleryItem({
      content: added.toString(),
      encodingFormat: encoding,
    });

    setIsUploading(false);
  }

  function clearForm() {
    const form = document.getElementById("galleryForm") as HTMLFormElement;
    form.reset();

    setDetectedFileFormat(null);
    setFileFormat(null);
    setMediaGalleryItem({});
    setDidFail(false);
    setSelectedMediaGalleryItemIndex(null);
  }

  async function addToGallery() {
    if (!geoWebContent) {
      return;
    }

    setIsSaving(true);
    setDidFail(false);

    const trace = firebasePerf?.trace("add_media_item_to_gallery");
    trace?.start();

    await updateMediaGallery(mediaGalleryItem);

    trace?.stop();

    setShouldMediaGalleryUpdate(true);
  }

  async function saveChanges() {
    setIsSaving(true);

    await updateMediaGallery(mediaGalleryItem);

    setShouldMediaGalleryUpdate(true);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onSelectFileFormat(event: React.ChangeEvent<any>) {
    setFileFormat(event.target.value);

    updateMediaGalleryItem({
      encodingFormat: event.target.value,
    });
  }

  async function commitNewRoot(mediaGalleryItem: MediaGalleryItem) {
    if (!ceramic?.did) {
      throw Error("Could not find Ceramic DID");
    }

    const assetId = new AssetId({
      chainId: `eip155:${NETWORK_ID}`,
      assetName: {
        namespace: "erc721",
        reference: licenseAddress.toLowerCase(),
      },
      tokenId: new BN(selectedParcelId.slice(2), "hex").toString(10),
    });
    const ownerDID = ceramic.did.parent;
    let rootCid;
    let mediaGallery;

    rootCid = await geoWebContent.raw.resolveRoot({
      ownerDID,
      parcelId: assetId,
    });
    mediaGallery = await geoWebContent.raw.get(rootCid, "/mediaGallery", {
      schema: "MediaGallery",
    });

    if (!mediaGallery) {
      rootCid = await geoWebContent.raw.putPath(rootCid, "/mediaGallery", [], {
        parentSchema: "ParcelRoot",
        pin: true,
      });
      mediaGallery = await geoWebContent.raw.get(rootCid, "/mediaGallery", {
        schema: "MediaGallery",
      });
    }

    const cidStr = mediaGalleryItem.content;
    const mediaObject: MediaObject = {
      name: mediaGalleryItem.name ?? "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: CID.parse(cidStr ?? "") as any,
      encodingFormat: mediaGalleryItem.encodingFormat as Encoding,
    };
    const newRoot = await geoWebContent.raw.putPath(
      rootCid,
      selectedMediaGalleryItemIndex !== null
        ? `/mediaGallery/${selectedMediaGalleryItemIndex}`
        : `/mediaGallery/${mediaGallery?.length}`,
      mediaObject,
      { parentSchema: "MediaGallery", pin: true }
    );

    const contentHash = await geoWebContent.raw.commit(newRoot);
    setRootCid(newRoot.toString());

    return contentHash;
  }

  async function updateMediaGallery(mediaGalleryItem: MediaGalleryItem) {
    if (!licenseDiamondContract) {
      throw new Error("Could not find licenseDiamondContract");
    }

    if (!perSecondFeeNumerator) {
      throw new Error("Could not find perSecondFeeNumerator");
    }

    if (!perSecondFeeDenominator) {
      throw new Error("Could not find perSecondFeeDenominator");
    }

    if (!existingForSalePrice) {
      throw new Error("Could not find existingForSalePrice");
    }

    const existingNetworkFee = fromValueToRate(
      existingForSalePrice,
      perSecondFeeNumerator,
      perSecondFeeDenominator
    );
    const contentHash = await commitNewRoot(mediaGalleryItem);

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

      const editBidData = licenseDiamondContract.interface.encodeFunctionData(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        "editBid(int96,uint256,bytes)",
        [existingNetworkFee, existingForSalePrice, contentHash]
      );

      const editBidTransaction = {
        to: licenseDiamondContract.address,
        data: editBidData,
        value: "0",
      };
      metaTransactions.push(editBidTransaction);

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

      const txn = await licenseDiamondContract
        .connect(signer)
        ["editBid(int96,uint256,bytes)"](
          existingNetworkFee,
          existingForSalePrice,
          contentHash
        );

      await txn.wait();
    }
  }

  const isReadyToAdd =
    mediaGalleryItem.content && mediaGalleryItem.name && !isSaving;

  const spinner = (
    <span
      className="spinner-border"
      role="status"
      style={{ height: "1.5em", width: "1.5em" }}
    >
      <span className="visually-hidden"></span>
    </span>
  );

  return (
    <>
      <Form id="galleryForm" className="pt-2 text-start">
        <Row className="px-1 px-sm-3 d-flex align-items-end">
          <Col sm="12" lg="6" className="mb-3">
            <Form.Text className="text-primary">CID</Form.Text>
            <InputGroup>
              <Button
                variant="secondary"
                style={{ height: 35, width: 42 }}
                className="d-flex justify-content-center mt-1"
                as="label"
                htmlFor="uploadCid"
                disabled={isUploading || selectedMediaGalleryItemIndex !== null}
              >
                <Image src="upload.svg" alt="upload" />
              </Button>
              <Form.Control
                style={{ backgroundColor: "#111320", border: "none" }}
                className="text-white mt-1"
                type="text"
                placeholder="Upload media or add an existing CID"
                readOnly={isUploading || selectedMediaGalleryItemIndex !== null}
                value={mediaGalleryItem?.content ?? ""}
                onChange={updateContentUrl}
              />
              <Form.Control
                type="file"
                id="uploadCid"
                style={{ backgroundColor: "#111320", border: "none" }}
                className="mt-1"
                accept={getFormatCS()}
                disabled={isUploading || selectedMediaGalleryItemIndex !== null}
                onChange={captureFile}
                hidden
              ></Form.Control>
            </InputGroup>
          </Col>
          <Col sm="12" lg="6" className="mb-3">
            <Form.Text className="text-primary mb-1">Name</Form.Text>
            <Form.Control
              style={{ backgroundColor: "#111320", border: "none" }}
              className="text-white mt-1"
              type="text"
              placeholder="Display Name of Media"
              value={mediaGalleryItem.name ?? ""}
              required
              onChange={(e) => {
                updateMediaGalleryItem({
                  name: e.target.value,
                });
              }}
            />
          </Col>
        </Row>
        <Row className="px-1 px-sm-3 d-flex align-items-end">
          <Col sm="12" lg="6" className="mb-3">
            <div key="inline-radio">
              <Form.Text className="text-primary mb-1">File Format</Form.Text>
              <Form.Control
                as="select"
                className="text-white mt-1"
                style={{ backgroundColor: "#111320", border: "none" }}
                onChange={onSelectFileFormat}
                value={detectedFileFormat ?? fileFormat ?? ""}
                required
                disabled={detectedFileFormat != null}
              >
                <option value="">Select a File Format</option>

                {galleryFileFormats.map((_format, i) => (
                  <option key={i} value={_format.encoding}>
                    {_format.extension} ({_format.encoding})
                  </option>
                ))}
              </Form.Control>
            </div>
          </Col>
          {!isMobile && (
            <Col sm="12" lg="6" className="mb-3">
              <Form.Text className="text-primary mb-1">
                Content Pinning Service
              </Form.Text>
              <Form.Control
                as="select"
                className="text-white mt-1"
                style={{ backgroundColor: "#111320", border: "none" }}
                disabled
              >
                <option value="buckets">Geo Web Free (Default)</option>
              </Form.Control>
            </Col>
          )}
        </Row>
        <Row className="px-1 px-sm-3 text-end justify-content-end">
          <Col xs="6" md="6" lg="3" className="mb-3">
            <Button
              variant="danger"
              disabled={!fileFormat || isSaving}
              onClick={clearForm}
              className="w-100"
            >
              Cancel
            </Button>
          </Col>
          <Col xs="6" md="6" lg="3">
            {selectedMediaGalleryItemIndex !== null ? (
              <Button
                variant="secondary"
                className="w-100"
                onClick={saveChanges}
              >
                {isSaving ? spinner : "Save Changes"}
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled={!isReadyToAdd}
                className="w-100"
                onClick={addToGallery}
              >
                {isSaving ? spinner : "Add to Gallery"}
              </Button>
            )}
          </Col>
          {didFail ? (
            <Col className="text-danger">
              Failed to add item. An unknown error occurred.
            </Col>
          ) : null}
        </Row>
      </Form>
    </>
  );
}

export default GalleryForm;
