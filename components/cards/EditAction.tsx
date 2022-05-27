import * as React from "react";
import { BigNumber, ethers } from "ethers";
import { ActionData, ActionForm } from "./ActionForm";
import FaucetInfo from "./FaucetInfo";
import { formatBalance } from "../../lib/formatBalance";
import { SidebarProps } from "../Sidebar";
import TransactionSummaryView from "./TransactionSummaryView";

export type EditActionProps = SidebarProps & {
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
          <TransactionSummaryView
            txnNeeded={true}
            newNetworkFee={networkFeeRatePerSecond}
            {...props}
          />
        }
        {...props}
      />
      <FaucetInfo></FaucetInfo>
    </>
  );
}

export default EditAction;
