import * as React from "react";
import { STATE_PARCEL_SELECTED } from "../Map";
import { ActionForm, calculateWeiSubtotalField } from "./ActionForm";
import FaucetInfo from "./FaucetInfo";
import { ethers, BigNumber } from "ethers";

function PurchaseAction({
  adminContract,
  account,
  perSecondFeeNumerator,
  perSecondFeeDenominator,
  parcelData,
  refetchParcelData,
  setInteractionState,
  adminAddress,
  auctionValue,
  parcelIndexManager,
  existingNetworkFeeBalance,
}) {
  function _calculateNetworkFeeBalance(
    existingExpirationTimestamp,
    existingForSalePriceWei
  ) {
    let now = new Date();
    let existingTimeBalance = existingExpirationTimestamp
      ? (existingExpirationTimestamp * 1000 - now.getTime()) / 1000
      : 0;

    existingTimeBalance = Math.max(existingTimeBalance, 0);

    let existingPerSecondFee = new BN(
      existingForSalePriceWei ? existingForSalePriceWei : 0
    )
      .mul(perSecondFeeNumerator)
      .div(perSecondFeeDenominator);

    return existingPerSecondFee.muln(existingTimeBalance);
  }

  const _currentForSalePriceWei =
    auctionValue > 0 ? auctionValue : parcelData.landParcel.license.value;
  const displayCurrentForSalePrice = ethers.utils.formatEther(
    ethers.utils.parseUnits(parcelData.landParcel.license.value, "wei")
  );
  const parcelContent = parcelIndexManager
    ? parcelIndexManager.getStreamContent()
    : null;
  const [actionData, setActionData] = React.useState({
    displayCurrentForSalePrice: displayCurrentForSalePrice,
    currentExpirationTimestamp:
      parcelData.landParcel.license.expirationTimestamp,
    transactionSubtotal: BigNumber.from(_currentForSalePriceWei).add(
      existingNetworkFeeBalance
    ),
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

  const {
    displayNewForSalePrice,
    displayNetworkFeePayment,
    isActing,
    didFail,
  } = actionData;

  React.useEffect(() => {
    const currentForSalePriceWei =
      auctionValue > 0 ? auctionValue : parcelData.landParcel.license.value;

    // Add a 1% buffer
    let _transactionSubtotal = BigNumber.from(currentForSalePriceWei)
      .mul(101)
      .div(100)
      .add(calculateWeiSubtotalField(displayNetworkFeePayment))
      .add(existingNetworkFeeBalance);

    updateActionData({ transactionSubtotal: _transactionSubtotal });
  }, [
    displayNetworkFeePayment,
    auctionValue,
    parcelData,
    existingNetworkFeeBalance,
  ]);

  async function _purchase() {
    updateActionData({ isActing: true });

    try {
      const resp = await adminContract.purchaseLicense(
        parcelData.landParcel.id,
        actionData.transactionSubtotal,
        calculateWeiSubtotalField(displayNewForSalePrice),
        { from: account, value: actionData.transactionSubtotal }
      );
      await resp.wait();
      refetchParcelData();
    } catch (error) {
      console.error(error);
      updateActionData({ isActing: false, didFail: true });
    }
  }

  return (
    <>
      <ActionForm
        title="Transfer"
        adminContract={adminContract}
        perSecondFeeNumerator={perSecondFeeNumerator}
        perSecondFeeDenominator={perSecondFeeDenominator}
        performAction={_purchase}
        parcelIndexManager={parcelIndexManager}
        actionData={actionData}
        setActionData={setActionData}
        setInteractionState={setInteractionState}
      />
      <FaucetInfo account={account} adminAddress={adminAddress}></FaucetInfo>
    </>
  );
}

export default PurchaseAction;
