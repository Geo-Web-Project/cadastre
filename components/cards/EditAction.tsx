import * as React from "react";
import { BigNumber, ethers } from "ethers";
import { ActionData, ActionForm } from "./ActionForm";
import FaucetInfo from "./FaucetInfo";
import { formatBalance } from "../../lib/formatBalance";
import { SidebarProps } from "../Sidebar";
import TransactionSummaryView from "./TransactionSummaryView";
import { fromValueToRate } from "../../lib/utils";

export type EditActionProps = SidebarProps & {
  perSecondFeeNumerator: BigNumber | null;
  perSecondFeeDenominator: BigNumber | null;
  basicProfileStreamManager: any;
  licenseAddress: string;
  parcelData: any;
};

enum Action {
  CLAIM,
  BID,
}

function EditAction(props: EditActionProps) {
  const {
    parcelData,
    // refetchParcelData,
    basicProfileStreamManager,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    selectedParcelId,
  } = props;
  const displayCurrentForSalePrice = formatBalance(
    parcelData.landParcel.license.forSalePrice
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
    parcelName: parcelContent ? parcelContent.name : null,
    parcelWebContentURI: parcelContent ? parcelContent.url : null,
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

  const newNetworkFee =
    displayNewForSalePrice && perSecondFeeNumerator && perSecondFeeDenominator
      ? fromValueToRate(
          ethers.utils.parseEther(displayNewForSalePrice),
          perSecondFeeNumerator,
          perSecondFeeDenominator
        )
      : null;

  async function _edit() {
    updateActionData({ isActing: true });

    // Check for changes
    if (
      !displayNewForSalePrice ||
      displayNewForSalePrice == displayCurrentForSalePrice
    ) {
      // Content change only
      return;
    }

    const bidData = ethers.utils.defaultAbiCoder.encode(
      ["uint256"],
      [selectedParcelId]
    );

    const actionData = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "bytes"],
      [ethers.utils.parseEther(displayNewForSalePrice), bidData]
    );

    const userData = ethers.utils.defaultAbiCoder.encode(
      ["uint8", "bytes"],
      [Action.BID, actionData]
    );

    // const newContributionRate = fromValueToRate(
    //   newForSalePrice,
    //   perSecondFeeNumerator,
    //   perSecondFeeDenominator
    // );
    // const resp = await collectorContract.setContributionRate(
    //   parcelData.landParcel.id,
    //   newContributionRate,
    //   {
    //     from: account,
    //     value: paymentValue,
    //   }
    // );

    // await resp.wait();

    // refetchParcelData();
  }

  return (
    <>
      <ActionForm
        loading={false}
        performAction={_edit}
        actionData={actionData}
        setActionData={setActionData}
        summaryView={
          existingNetworkFee ? (
            <TransactionSummaryView
              existingNetworkFee={existingNetworkFee}
              newNetworkFee={newNetworkFee ?? existingNetworkFee}
              {...props}
            />
          ) : (
            <></>
          )
        }
        {...props}
      />
      <FaucetInfo></FaucetInfo>
    </>
  );
}

export default EditAction;
