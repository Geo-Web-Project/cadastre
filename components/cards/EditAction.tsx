import * as React from "react";
import { BigNumber, ethers } from "ethers";
import { ActionData, ActionForm } from "./ActionForm";
import { formatBalance } from "../../lib/formatBalance";
import { SidebarProps } from "../Sidebar";
import TransactionSummaryView from "./TransactionSummaryView";
import { fromValueToRate } from "../../lib/utils";
import { BasicProfileStreamManager } from "../../lib/stream-managers/BasicProfileStreamManager";
import { SECONDS_IN_YEAR } from "../../lib/constants";
import StreamingInfo from "./StreamingInfo";
import type { PCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/PCOLicenseDiamond";

export type EditActionProps = SidebarProps & {
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  basicProfileStreamManager: BasicProfileStreamManager | null;
  hasOutstandingBid: boolean;
  parcelData: any;
  licenseDiamondContract: PCOLicenseDiamond | null;
};

function EditAction(props: EditActionProps) {
  const {
    parcelData,
    basicProfileStreamManager,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    paymentToken,
    account,
    hasOutstandingBid,
    licenseDiamondContract,
    registryContract,
  } = props;
  const displayCurrentForSalePrice = formatBalance(
    parcelData.landParcel.license.currentOwnerBid.forSalePrice
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

    const txn = await licenseDiamondContract.editBid(
      newNetworkFee,
      ethers.utils.parseEther(displayNewForSalePrice)
    );
    await txn.wait();
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
        {...props}
      />
      <StreamingInfo account={account} paymentToken={paymentToken} />
    </>
  );
}

export default EditAction;
