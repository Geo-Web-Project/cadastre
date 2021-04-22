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
  paymentTokenContract,
  adminAddress,
  auctionValue,
  parcelRootStreamManager,
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
  const parcelContent = parcelRootStreamManager
    ? parcelRootStreamManager.getStreamContent()
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

  async function _purchase(newStreamId, getCurrentStreamId) {
    updateActionData({ isActing: true });

    const rootCID = newStreamId ?? getCurrentStreamId();

    try {
      const resp = await adminContract.purchaseLicense(
        parcelData.landParcel.id,
        actionData.transactionSubtotal,
        calculateWeiSubtotalField(displayNewForSalePrice),
        calculateWeiSubtotalField(displayNetworkFeePayment),
        rootCID.toString(),
        { from: account }
      );
      const receipt = await resp.wait();
      updateActionData({ isActing: false });
      refetchParcelData();
      setInteractionState(STATE_PARCEL_SELECTED);
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
        parcelRootStreamManager={parcelRootStreamManager}
        actionData={actionData}
        setActionData={setActionData}
      />
      <FaucetInfo
        paymentTokenContract={paymentTokenContract}
        account={account}
        adminAddress={adminAddress}
      ></FaucetInfo>
    </>
  );
}

export default PurchaseAction;
