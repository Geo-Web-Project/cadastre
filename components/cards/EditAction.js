import * as React from "react";
import { ethers, BigNumber } from "ethers";
import { STATE_PARCEL_SELECTED } from "../Map";
import { ActionForm, calculateWeiSubtotalField } from "./ActionForm";
import FaucetInfo from "./FaucetInfo";

function EditAction({
  adminContract,
  account,
  perSecondFeeNumerator,
  perSecondFeeDenominator,
  parcelData,
  refetchParcelData,
  setInteractionState,
  paymentTokenContract,
  adminAddress,
  parcelContentManager,
}) {
  const displayCurrentForSalePrice = ethers.utils.formatEther(
    ethers.utils.parseUnits(parcelData.landParcel.license.value, "wei")
  );
  const parcelContent = parcelContentManager
    ? parcelContentManager.getRootStreamContent()
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
    parcelWebContentURI: parcelContent ? parcelContent.webContent : null,
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

  function _edit() {
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
      updateActionData({ isActing: false });
      setInteractionState(STATE_PARCEL_SELECTED);
      return;
    }

    let newForSalePrice = ethers.utils.parseEther(displayNewForSalePrice);
    adminContract
      .updateValue(
        parcelData.landParcel.id,
        newForSalePrice,
        displayNetworkFeePayment.length > 0 ? networkFeePayment : 0,
        { from: account }
      )
      .then((resp) => {
        return resp.wait();
      })
      .then(async function (receipt) {
        updateActionData({ isActing: false });
        refetchParcelData();
        setInteractionState(STATE_PARCEL_SELECTED);
      })
      .catch((error) => {
        updateActionData({ isActing: false, didFail: true });
      });
  }

  return (
    <>
      <ActionForm
        title="Edit"
        adminContract={adminContract}
        perSecondFeeNumerator={perSecondFeeNumerator}
        perSecondFeeDenominator={perSecondFeeDenominator}
        performAction={_edit}
        actionData={actionData}
        setActionData={setActionData}
        parcelContentManager={parcelContentManager}
      />
      <FaucetInfo
        paymentTokenContract={paymentTokenContract}
        account={account}
        adminAddress={adminAddress}
      ></FaucetInfo>
    </>
  );
}

export default EditAction;
