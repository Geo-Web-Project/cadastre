import * as React from "react";
import { BigNumber, ethers } from "ethers";
import { ActionData, ActionForm } from "./ActionForm";
import { formatBalance } from "../../lib/formatBalance";
import { SidebarProps } from "../Sidebar";
import TransactionSummaryView from "./TransactionSummaryView";
import { fromValueToRate, calculateBufferNeeded } from "../../lib/utils";
import { BasicProfileStreamManager } from "../../lib/stream-managers/BasicProfileStreamManager";
import { SECONDS_IN_YEAR } from "../../lib/constants";
import StreamingInfo from "./StreamingInfo";
import type { PCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/PCOLicenseDiamond";
import { GeoWebParcel, ParcelFieldsToUpdate } from "./ParcelInfo";

export type EditActionProps = SidebarProps & {
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  basicProfileStreamManager: BasicProfileStreamManager | null;
  hasOutstandingBid: boolean;
  parcelData: GeoWebParcel;
  licenseDiamondContract: PCOLicenseDiamond | null;
  setParcelFieldsToUpdate: React.Dispatch<
    React.SetStateAction<ParcelFieldsToUpdate | null>
  >;
};

function EditAction(props: EditActionProps) {
  const {
    parcelData,
    basicProfileStreamManager,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    hasOutstandingBid,
    licenseDiamondContract,
    registryContract,
    sfFramework,
    paymentToken,
    provider,
    setParcelFieldsToUpdate,
  } = props;
  const displayCurrentForSalePrice = formatBalance(
    parcelData.currentBid.forSalePrice
  );

  const parcelContent = basicProfileStreamManager
    ? basicProfileStreamManager.getStreamContent()
    : null;
  const [actionData, setActionData] = React.useState<ActionData>({
    displayCurrentForSalePrice: displayCurrentForSalePrice,
    isActing: false,
    didFail: false,
    displayNewForSalePrice: displayCurrentForSalePrice
      ? displayCurrentForSalePrice
      : "",
    parcelName: parcelContent ? parcelContent.name : undefined,
    parcelWebContentURI: parcelContent ? parcelContent.url : undefined,
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

  async function _edit() {
    updateActionData({ isActing: true });

    if (!licenseDiamondContract) {
      throw new Error("Could not find licenseDiamondContract");
    }

    if (!existingNetworkFee) {
      throw new Error("Could not find existingNetworkFee");
    }

    // Check for changes
    if (
      !displayNewForSalePrice ||
      !newNetworkFee ||
      displayNewForSalePrice == displayCurrentForSalePrice
    ) {
      // Content change only
      return;
    }

    const txn = await licenseDiamondContract
      .connect(provider.getSigner())
      .editBid(newNetworkFee, ethers.utils.parseEther(displayNewForSalePrice));
    await txn.wait();
    setParcelFieldsToUpdate({ forSalePrice: true, licenseOwner: false });
  }

  return (
    <>
      <ActionForm
        licenseAddress={registryContract.address}
        loading={false}
        performAction={_edit}
        actionData={actionData}
        setActionData={setActionData}
        summaryView={
          existingAnnualNetworkFee && !hasOutstandingBid ? (
            <TransactionSummaryView
              existingAnnualNetworkFee={existingAnnualNetworkFee}
              newAnnualNetworkFee={
                newAnnualNetworkFee ?? existingAnnualNetworkFee
              }
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
        {...props}
      />
      <StreamingInfo {...props} />
    </>
  );
}

export default EditAction;
