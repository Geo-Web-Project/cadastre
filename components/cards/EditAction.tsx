import * as React from "react";
import { BigNumber } from "ethers";
import { ActionData, ActionForm } from "./ActionForm";
import FaucetInfo from "./FaucetInfo";
import { formatBalance } from "../../lib/formatBalance";
import { SidebarProps } from "../Sidebar";

export type EditActionProps = SidebarProps & {
  basicProfileStreamManager: any;
  licenseAddress: string;
  parcelData: any;
};

function EditAction(props: EditActionProps) {
  const {
    parcelData,
    // refetchParcelData,
    basicProfileStreamManager,
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
    if (displayNewForSalePrice == displayCurrentForSalePrice) {
      // Content change only
      return;
    }

    // const newForSalePrice = ethers.utils.parseEther(displayNewForSalePrice ?? displayCurrentForSalePrice);

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
        {...props}
      />
      <FaucetInfo></FaucetInfo>
    </>
  );
}

export default EditAction;
