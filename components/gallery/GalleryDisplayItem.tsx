import * as React from "react";
import { BigNumber } from "ethers";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import BN from "bn.js";
import { AssetId } from "caip";
import type { MediaObject } from "@geo-web/types";
import { GalleryModalProps } from "./GalleryModal";
import { getFormatType } from "./GalleryFileFormat";
import { fromValueToRate } from "../../lib/utils";
import { useBundleSettings } from "../../lib/transactionBundleSettings";
import { useSafe } from "../../lib/safe";
import { useSuperTokenBalance } from "../../lib/superTokenBalance";
import { NETWORK_ID, ZERO_ADDRESS } from "../../lib/constants";

const DISPLAY_TYPES: Record<string, string> = {
  "3DModel": "3D Model",
  ImageObject: "Image",
  VideoObject: "Video",
  AudioObject: "Audio",
};

export type GalleryDisplayItemProps = GalleryModalProps & {
  mediaGalleryItem: MediaObject;
  index: number;
  selectedMediaGalleryItemIndex: number | null;
  shouldMediaGalleryUpdate: boolean;
  setSelectedMediaGalleryItemIndex: React.Dispatch<
    React.SetStateAction<number | null>
  >;
  setShouldMediaGalleryUpdate: React.Dispatch<React.SetStateAction<boolean>>;
  setRootCid: React.Dispatch<React.SetStateAction<string | null>>;
};

function GalleryDisplayItem(props: GalleryDisplayItemProps) {
  const {
    mediaGalleryItem,
    geoWebContent,
    ceramic,
    licenseAddress,
    selectedParcelId,
    index,
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

  const { relayTransaction, estimateTransactionBundleFees } = useSafe(
    smartAccount?.safe ?? null
  );
  const { superTokenBalance } = useSuperTokenBalance(
    smartAccount?.safe ? smartAccount.address : "",
    paymentToken.address
  );
  const bundleSettings = useBundleSettings();

  const [isHovered, setIsHovered] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);

  const isEditing = selectedMediaGalleryItemIndex === index;
  const shouldHighlight = !isRemoving && (isHovered || isEditing);
  const name = mediaGalleryItem?.name;
  const fileType = getFormatType(mediaGalleryItem?.encodingFormat);

  const spinner = (
    <span className="spinner-border" role="status">
      <span className="visually-hidden"></span>
    </span>
  );

  let statusView;
  if (isRemoving) {
    statusView = (
      <Col className="text-white">
        <h4>Removing</h4>
        {spinner}
      </Col>
    );
  }

  React.useEffect(() => {
    if (isRemoving && !shouldMediaGalleryUpdate) {
      setIsRemoving(false);
    }
  }, [shouldMediaGalleryUpdate]);

  async function removeMediaGalleryItem() {
    if (!geoWebContent || !ceramic.did) {
      return;
    }

    setIsRemoving(true);

    const assetId = new AssetId({
      chainId: `eip155:${NETWORK_ID}`,
      assetName: {
        namespace: "erc721",
        reference: licenseAddress.toLowerCase(),
      },
      tokenId: new BN(selectedParcelId.slice(2), "hex").toString(10),
    });
    const rootCid = await geoWebContent.raw.resolveRoot({
      ownerDID: ceramic.did?.parent,
      parcelId: assetId,
    });
    const newRoot = await geoWebContent.raw.deletePath(
      rootCid,
      `/mediaGallery/${index}`,
      {
        pin: true,
      }
    );

    const contentHash = await geoWebContent.raw.commit(newRoot);

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

      const { transactionFeesEstimate } = await estimateTransactionBundleFees(
        metaTransactions
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

    setRootCid(newRoot.toString());
    setShouldMediaGalleryUpdate(true);
  }

  function handleEdit() {
    setSelectedMediaGalleryItemIndex(index);
  }

  return (
    <Container
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`text-center p-3 rounded ${
        shouldHighlight ? "border border-secondary" : ""
      }`}
    >
      <Row>
        <Col style={statusView ? { opacity: "0.3" } : {}}>
          <h1 style={{ fontSize: "1.5em" }}>
            {index + 1}. {name}
          </h1>
        </Col>
      </Row>
      <Row>
        <Col style={{ height: "100px" }}>
          <Image style={statusView ? { opacity: "0.3" } : {}} src="file.png" />
          <div className="position-relative bottom-100">{statusView}</div>
        </Col>
      </Row>
      {fileType && (
        <Row
          className="text-center"
          style={statusView ? { opacity: "0.3" } : {}}
        >
          <Col>{DISPLAY_TYPES[fileType]}</Col>
        </Row>
      )}
      <Row
        style={{
          visibility: shouldHighlight ? "visible" : "hidden",
        }}
      >
        <Col>
          <Button variant="info" onClick={handleEdit} disabled={isEditing}>
            Edit
          </Button>
        </Col>
        <Col>
          <Button variant="danger" onClick={removeMediaGalleryItem}>
            Delete
          </Button>
        </Col>
      </Row>
    </Container>
  );
}

export default GalleryDisplayItem;
