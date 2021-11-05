import * as React from "react";
import { STATE_PARCEL_SELECTED } from "../Map";
import {
  ActionForm,
  calculateWeiSubtotalField,
  fromRateToValue,
  fromValueToRate,
} from "./ActionForm";
import FaucetInfo from "./FaucetInfo";
import { ethers, BigNumber } from "ethers";

function PurchaseAction({
  purchaserContract,
  collectorContract,
  account,
  perSecondFeeNumerator,
  perSecondFeeDenominator,
  parcelData,
  refetchParcelData,
  setInteractionState,
  auctionValue,
  parcelIndexManager,
  basicProfileStreamManager,
  existingNetworkFeeBalance,
  licenseAddress,
}) {
  const _currentForSalePriceWei =
    auctionValue > 0
      ? auctionValue
      : fromRateToValue(
          BigNumber.from(parcelData.landParcel.license.contributionRate),
          perSecondFeeNumerator,
          perSecondFeeDenominator
        );
  const displayCurrentForSalePrice = ethers.utils.formatEther(
    _currentForSalePriceWei
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
    const value = fromRateToValue(
      BigNumber.from(parcelData.landParcel.license.contributionRate),
      perSecondFeeNumerator,
      perSecondFeeDenominator
    );
    const currentForSalePriceWei = auctionValue > 0 ? auctionValue : value;

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
    perSecondFeeNumerator,
    perSecondFeeDenominator,
  ]);

  async function _purchase() {
    updateActionData({ isActing: true });

    const newValue = calculateWeiSubtotalField(displayNewForSalePrice);
    const newContributionRate = fromValueToRate(
      newValue,
      perSecondFeeNumerator,
      perSecondFeeDenominator
    );
    try {
      const resp = await purchaserContract.purchase(
        parcelData.landParcel.id,
        account,
        actionData.transactionSubtotal,
        newContributionRate,
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
        collectorContract={collectorContract}
        perSecondFeeNumerator={perSecondFeeNumerator}
        perSecondFeeDenominator={perSecondFeeDenominator}
        performAction={_purchase}
        parcelIndexManager={parcelIndexManager}
        basicProfileStreamManager={basicProfileStreamManager}
        actionData={actionData}
        setActionData={setActionData}
        setInteractionState={setInteractionState}
        licenseAddress={licenseAddress}
      />
      <FaucetInfo></FaucetInfo>
    </>
  );
}

export default PurchaseAction;
