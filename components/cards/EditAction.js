import * as React from "react";
import { ethers, BigNumber } from "ethers";
import { STATE_PARCEL_SELECTED } from "../Map";
import {
  ActionForm,
  calculateWeiSubtotalField,
  fromValueToRate,
} from "./ActionForm";
import FaucetInfo from "./FaucetInfo";

function EditAction({
  collectorContract,
  account,
  perSecondFeeNumerator,
  perSecondFeeDenominator,
  parcelData,
  refetchParcelData,
  setInteractionState,
  parcelIndexManager,
  basicProfileStreamManager,
}) {
  const displayCurrentForSalePrice = ethers.utils.formatEther(
    ethers.utils.parseUnits(parcelData.landParcel.license.value, "wei")
  );

  const parcelContent = basicProfileStreamManager
    ? basicProfileStreamManager.getStreamContent()
    : null;
  const [actionData, setActionData] = React.useState({
    displayCurrentForSalePrice: displayCurrentForSalePrice,
    currentExpirationTimestamp:
      parcelData.landParcel.license.expirationTimestamp,
    isActing: false,
    didFail: false,
    displayNetworkFeePayment: "",
    displayNewForSalePrice: displayCurrentForSalePrice
      ? displayCurrentForSalePrice
      : "",
    parcelName: parcelContent ? parcelContent.name : null,
    parcelWebContentURI: parcelContent ? parcelContent.url : null,
  });

  function updateActionData(updatedValues) {
    function _updateData(updatedValues) {
      return (prevState) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setActionData(_updateData(updatedValues));
  }

  const { displayNewForSalePrice, displayNetworkFeePayment } = actionData;

  React.useEffect(() => {
    let _transactionSubtotal = calculateWeiSubtotalField(
      displayNetworkFeePayment
    );

    updateActionData({ transactionSubtotal: _transactionSubtotal });
  }, [displayNetworkFeePayment]);

  async function _edit() {
    updateActionData({ isActing: true });

    // Check for changes
    const networkFeePayment = ethers.utils.parseEther(
      displayNetworkFeePayment.length > 0 ? displayNetworkFeePayment : "0"
    );
    const networkFeeIsUnchanged =
      displayNetworkFeePayment.length == 0 || networkFeePayment == 0;
    if (
      displayNewForSalePrice == displayCurrentForSalePrice &&
      networkFeeIsUnchanged
    ) {
      // Content change only
      return;
    }

    let newForSalePrice = ethers.utils.parseEther(displayNewForSalePrice);
    let paymentValue =
      displayNetworkFeePayment.length > 0 ? networkFeePayment : 0;

    try {
      const newContributionRate = fromValueToRate(
        newForSalePrice,
        perSecondFeeNumerator,
        perSecondFeeDenominator
      );
      const resp = await collectorContract.setContributionRate(
        parcelData.landParcel.id,
        newContributionRate,
        {
          from: account,
          value: paymentValue,
        }
      );

      await resp.wait();

      refetchParcelData();
      setInteractionState(STATE_PARCEL_SELECTED);
    } catch (error) {
      updateActionData({ isActing: false, didFail: true });
    }
  }

  return (
    <>
      <ActionForm
        title="Edit"
        collectorContract={collectorContract}
        perSecondFeeNumerator={perSecondFeeNumerator}
        perSecondFeeDenominator={perSecondFeeDenominator}
        performAction={_edit}
        actionData={actionData}
        setActionData={setActionData}
        parcelIndexManager={parcelIndexManager}
        basicProfileStreamManager={basicProfileStreamManager}
        setInteractionState={setInteractionState}
      />
      <FaucetInfo></FaucetInfo>
    </>
  );
}

export default EditAction;
