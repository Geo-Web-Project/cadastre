import * as React from "react";
import { BigNumber, ethers } from "ethers";
import type { IPCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/IPCOLicenseDiamond";
import { ActionData, ActionForm } from "./ActionForm";
import { formatBalance } from "../../../lib/formatBalance";
import { ParcelFieldsToUpdate } from "../OffCanvasPanel";
import TransactionSummaryView from "./TransactionSummaryView";
import { fromValueToRate, calculateBufferNeeded } from "../../../lib/utils";
import { SECONDS_IN_YEAR } from "../../../lib/constants";
import StreamingInfo from "./StreamingInfo";
import { GeoWebParcel, ParcelInfoProps } from "./ParcelInfo";

export type EditActionProps = ParcelInfoProps & {
  signer: ethers.Signer;
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
};

function EditAction(props: EditActionProps) {
  const {
    signer,
    parcelData,
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

  async function editBid() {
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
      ["editBid(int96,uint256)"](
        newNetworkFee ?? existingNetworkFee,
        ethers.utils.parseEther(
          displayNewForSalePrice ?? displayCurrentForSalePrice
        )
      );
    await txn.wait();
  }

  return (
    <>
      <ActionForm
        loading={false}
        performAction={editBid}
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
