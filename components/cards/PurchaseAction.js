import * as React from "react";
import Web3 from "web3";
import { STATE_PARCEL_SELECTED } from "../Map";
import { ActionForm, calculateWeiSubtotalField } from "./ActionForm";
import FaucetInfo from "./FaucetInfo";
import BN from "bn.js";

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
  ceramic,
  parcelContentDoc,
}) {
  const currentForSalePriceWei =
    auctionValue > 0 ? auctionValue : parcelData.landParcel.license.value;
  const currentExpirationTimestamp =
    parcelData.landParcel.license.expirationTimestamp;

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

  let existingNetworkFeeBalanceWei = _calculateNetworkFeeBalance(
    currentExpirationTimestamp,
    currentForSalePriceWei
  );

  const currentForSalePrice = Web3.utils.fromWei(
    parcelData.landParcel.license.value
  );
  const [actionData, setActionData] = React.useState({
    currentForSalePrice: currentForSalePrice,
    currentExpirationTimestamp: currentExpirationTimestamp,
    transactionSubtotal: new BN(currentForSalePriceWei).add(
      existingNetworkFeeBalanceWei
    ),
    isActing: false,
    didFail: false,
    networkFeePayment: "",
    newForSalePrice: currentForSalePrice ? currentForSalePrice : "",
    parcelName: parcelContentDoc ? parcelContentDoc.content.name : null,
    parcelWebContentURI: parcelContentDoc
      ? parcelContentDoc.content.webContent
      : null,
  });

  function updateActionData(updatedValues) {
    function _updateData(updatedValues) {
      return (prevState) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setActionData(_updateData(updatedValues));
  }

  const { newForSalePrice, networkFeePayment, isActing, didFail } = actionData;

  React.useEffect(() => {
    let _transactionSubtotal = new BN(currentForSalePriceWei)
      .add(calculateWeiSubtotalField(networkFeePayment))
      .add(existingNetworkFeeBalanceWei);

    updateActionData({ transactionSubtotal: _transactionSubtotal });
  }, [networkFeePayment]);

  function _purchase(rootCID) {
    updateActionData({ isActing: true });

    adminContract.methods
      .purchaseLicense(
        parcelData.landParcel.id,
        actionData.transactionSubtotal,
        calculateWeiSubtotalField(newForSalePrice),
        calculateWeiSubtotalField(networkFeePayment),
        rootCID.toString()
      )
      .send({ from: account }, (error, txHash) => {
        if (error) {
          updateActionData({ isActing: false, didFail: true });
        }
      })
      .once("receipt", async function (receipt) {
        updateActionData({ isActing: false });
        refetchParcelData();
        setInteractionState(STATE_PARCEL_SELECTED);
      })
      .catch(() => {
        updateActionData({ isActing: false });
      });
  }

  return (
    <>
      <ActionForm
        title="Transfer"
        adminContract={adminContract}
        perSecondFeeNumerator={perSecondFeeNumerator}
        perSecondFeeDenominator={perSecondFeeDenominator}
        performAction={_purchase}
        ceramic={ceramic}
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
