import * as React from "react";
import { BigNumber, ethers } from "ethers";
import type { BasicProfile } from "@geo-web/types";
import type { IPCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/IPCOLicenseDiamond";
import { ActionData, ActionForm } from "./ActionForm";
import { formatBalance } from "../../lib/formatBalance";
import { ParcelFieldsToUpdate } from "../OffCanvasPanel";
import TransactionSummaryView from "./TransactionSummaryView";
import { fromValueToRate, calculateBufferNeeded } from "../../lib/utils";
import { SECONDS_IN_YEAR } from "../../lib/constants";
import StreamingInfo from "./StreamingInfo";
import { GeoWebParcel, ParcelInfoProps } from "./ParcelInfo";

export type EditActionProps = ParcelInfoProps & {
  signer: ethers.Signer;
  parcelContent: BasicProfile | null;
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  hasOutstandingBid: boolean;
  licenseOwner: string;
  parcelData: GeoWebParcel;
  licenseDiamondContract: IPCOLicenseDiamond | null;
  setParcelFieldsToUpdate: React.Dispatch<
    React.SetStateAction<ParcelFieldsToUpdate | null>
  >;
  minForSalePrice: BigNumber;
  setShouldParcelContentUpdate: React.Dispatch<React.SetStateAction<boolean>>;
  setRootCid: React.Dispatch<React.SetStateAction<string | null>>;
};

function EditAction(props: EditActionProps) {
  const {
    signer,
    parcelData,
    parcelContent,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    hasOutstandingBid,
    licenseDiamondContract,
    sfFramework,
    paymentToken,
  } = props;

  const displayCurrentForSalePrice = formatBalance(
    parcelData.currentBid.forSalePrice
  );

  const [actionData, setActionData] = React.useState<ActionData>({
    displayCurrentForSalePrice: displayCurrentForSalePrice,
    isActing: false,
    didFail: false,
    displayNewForSalePrice: displayCurrentForSalePrice
      ? displayCurrentForSalePrice
      : "",
  });
  const [transactionBundleFeesEstimate, setTransactionBundleFeesEstimate] =
    React.useState<BigNumber | null>(null);

  function updateActionData(updatedValues: ActionData) {
    function _updateData(updatedValues: ActionData) {
      return (prevState: ActionData) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setActionData(_updateData(updatedValues));
  }

  const { displayNewForSalePrice } = actionData;

  const isForSalePriceInvalid: boolean =
    displayNewForSalePrice != null &&
    displayNewForSalePrice.length > 0 &&
    isNaN(Number(displayNewForSalePrice));

  const existingNetworkFee =
    displayCurrentForSalePrice &&
    perSecondFeeNumerator &&
    perSecondFeeDenominator
      ? fromValueToRate(
          ethers.utils.parseEther(displayCurrentForSalePrice),
          perSecondFeeNumerator,
          perSecondFeeDenominator
        )
      : null;

  const existingAnnualNetworkFee =
    displayCurrentForSalePrice &&
    perSecondFeeNumerator &&
    perSecondFeeDenominator
      ? fromValueToRate(
          ethers.utils.parseEther(displayCurrentForSalePrice),
          perSecondFeeNumerator.mul(SECONDS_IN_YEAR),
          perSecondFeeDenominator
        )
      : null;

  const newNetworkFee =
    !isForSalePriceInvalid &&
    displayNewForSalePrice &&
    perSecondFeeNumerator &&
    perSecondFeeDenominator
      ? fromValueToRate(
          ethers.utils.parseEther(displayNewForSalePrice),
          perSecondFeeNumerator,
          perSecondFeeDenominator
        )
      : null;

  const newAnnualNetworkFee =
    !isForSalePriceInvalid &&
    displayNewForSalePrice &&
    perSecondFeeNumerator &&
    perSecondFeeDenominator
      ? fromValueToRate(
          ethers.utils.parseEther(displayNewForSalePrice),
          perSecondFeeNumerator.mul(SECONDS_IN_YEAR),
          perSecondFeeDenominator
        )
      : null;

  const [requiredExistingBuffer, setRequiredExistingBuffer] =
    React.useState<BigNumber | null>(null);

  React.useEffect(() => {
    const run = async () => {
      if (!existingNetworkFee) {
        setRequiredExistingBuffer(null);
        return;
      }

      const _bufferNeeded = await calculateBufferNeeded(
        sfFramework,
        paymentToken,
        existingNetworkFee
      );
      setRequiredExistingBuffer(_bufferNeeded);
    };

    run();
  }, [sfFramework, paymentToken, displayCurrentForSalePrice]);

  const [requiredNewBuffer, setRequiredNewBuffer] =
    React.useState<BigNumber | null>(null);

  React.useEffect(() => {
    const run = async () => {
      if (!newNetworkFee) {
        setRequiredNewBuffer(null);
        return;
      }

      const _bufferNeeded = await calculateBufferNeeded(
        sfFramework,
        paymentToken,
        newNetworkFee
      );
      setRequiredNewBuffer(_bufferNeeded);
    };

    run();
  }, [sfFramework, paymentToken, displayNewForSalePrice]);

  React.useEffect(() => {
    if (parcelContent) {
      updateActionData({
        parcelName: parcelContent.name,
        parcelWebContentURI: parcelContent.url,
      });
    }
  }, [parcelContent]);

  function encodeEditBidData(contentHash?: string) {
    if (!licenseDiamondContract) {
      throw new Error("Could not find licenseDiamondContract");
    }

    if (!existingNetworkFee) {
      throw new Error("Could not find existingNetworkFee");
    }

    const editBidData = licenseDiamondContract.interface.encodeFunctionData(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      "editBid(int96,uint256,bytes)",
      [
        newNetworkFee ?? existingNetworkFee,
        ethers.utils.parseEther(
          displayNewForSalePrice ?? displayCurrentForSalePrice
        ),
        contentHash ?? "0x",
      ]
    );

    return editBidData;
  }

  async function editBid(contentHash?: string) {
    updateActionData({ isActing: true });

    if (!licenseDiamondContract) {
      throw new Error("Could not find licenseDiamondContract");
    }

    if (!existingNetworkFee) {
      throw new Error("Could not find existingNetworkFee");
    }

    if (!signer) {
      throw new Error("Could not find existingNetworkFee");
    }

    const txn = await licenseDiamondContract
      .connect(signer)
      ["editBid(int96,uint256,bytes)"](
        newNetworkFee ?? existingNetworkFee,
        ethers.utils.parseEther(
          displayNewForSalePrice ?? displayCurrentForSalePrice
        ),
        contentHash ?? "0x"
      );
    await txn.wait();
  }

  function encodeEditContentHashData(contentHash?: string) {
    if (!licenseDiamondContract) {
      throw new Error("Could not find licenseDiamondContract");
    }

    const editContentHashData =
      licenseDiamondContract.interface.encodeFunctionData(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        "editContentHash(bytes)",
        [contentHash ?? "0x"]
      );

    return editContentHashData;
  }

  async function editContentHash(contentHash?: string) {
    updateActionData({ isActing: true });

    if (!licenseDiamondContract) {
      throw new Error("Could not find licenseDiamondContract");
    }

    if (!signer) {
      throw new Error("Could not find existingNetworkFee");
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const txn = await licenseDiamondContract
      .connect(signer)
      ["editContentHash(bytes)"](contentHash ?? "0x");

    await txn.wait();
  }

  return (
    <>
      <ActionForm
        loading={false}
        performAction={
          hasOutstandingBid ||
          displayNewForSalePrice === displayCurrentForSalePrice
            ? editContentHash
            : editBid
        }
        actionData={actionData}
        setActionData={setActionData}
        summaryView={
          existingAnnualNetworkFee && !hasOutstandingBid ? (
            <TransactionSummaryView
              existingAnnualNetworkFee={existingAnnualNetworkFee}
              newAnnualNetworkFee={
                newAnnualNetworkFee ?? existingAnnualNetworkFee
              }
              existingNetworkFee={existingNetworkFee ?? undefined}
              newNetworkFee={newNetworkFee}
              transactionBundleFeesEstimate={transactionBundleFeesEstimate}
              {...props}
            />
          ) : (
            <></>
          )
        }
        requiredPayment={
          requiredNewBuffer && requiredExistingBuffer
            ? requiredNewBuffer.sub(requiredExistingBuffer)
            : BigNumber.from(0)
        }
        requiredFlowPermissions={2}
        spender={licenseDiamondContract?.address ?? ""}
        flowOperator={licenseDiamondContract?.address ?? ""}
        encodeFunctionData={
          hasOutstandingBid ||
          displayNewForSalePrice === displayCurrentForSalePrice
            ? encodeEditContentHashData
            : encodeEditBidData
        }
        bundleCallback={async () => void 0}
        transactionBundleFeesEstimate={transactionBundleFeesEstimate}
        setTransactionBundleFeesEstimate={setTransactionBundleFeesEstimate}
        requiredBuffer={
          requiredNewBuffer && requiredExistingBuffer
            ? requiredNewBuffer.sub(requiredExistingBuffer)
            : BigNumber.from(0)
        }
        {...props}
      />
      <StreamingInfo {...props} />
    </>
  );
}

export default EditAction;
