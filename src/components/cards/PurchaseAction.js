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
}) {
  const [forSalePrice, setForSalePrice] = React.useState("");
  const [networkFeePayment, setNetworkFeePayment] = React.useState("");
  const [isActing, setIsActing] = React.useState(false);
  const [didFail, setDidFail] = React.useState(false);

  let currentForSalePriceWei = parcelData.landParcel.license.value;
  let currentExpirationTimestamp =
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

  let transactionSubtotal = new BN(currentForSalePriceWei)
    .add(calculateWeiSubtotalField(networkFeePayment))
    .add(existingNetworkFeeBalanceWei);

  function _purchase() {
    setIsActing(true);

    adminContract.methods
      .purchaseLicense(
        parcelData.landParcel.id,
        transactionSubtotal,
        calculateWeiSubtotalField(forSalePrice),
        calculateWeiSubtotalField(networkFeePayment)
      )
      .send({ from: account }, (error, txHash) => {
        if (error) {
          setDidFail(true);
          setIsActing(false);
        }
      })
      .once("receipt", async function (receipt) {
        setIsActing(false);
        refetchParcelData();
        setInteractionState(STATE_PARCEL_SELECTED);
      })
      .catch(() => {
        setIsActing(false);
      });
  }

  return (
    <>
      <ActionForm
        title="Transfer"
        adminContract={adminContract}
        perSecondFeeNumerator={perSecondFeeNumerator}
        perSecondFeeDenominator={perSecondFeeDenominator}
        isActing={isActing}
        performAction={_purchase}
        setForSalePrice={setForSalePrice}
        forSalePrice={forSalePrice}
        setNetworkFeePayment={setNetworkFeePayment}
        networkFeePayment={networkFeePayment}
        didFail={didFail}
        setDidFail={setDidFail}
        currentForSalePrice={Web3.utils.fromWei(currentForSalePriceWei)}
        currentExpirationTimestamp={currentExpirationTimestamp}
        transactionSubtotal={transactionSubtotal}
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
