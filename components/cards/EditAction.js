import * as React from "react";
import Web3 from "web3";
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
  ceramic,
  parcelContentDoc,
}) {
  const currentForSalePrice = Web3.utils.fromWei(
    parcelData.landParcel.license.value
  );
  const [actionData, setActionData] = React.useState({
    currentForSalePrice: currentForSalePrice,
    currentExpirationTimestamp:
      parcelData.landParcel.license.expirationTimestamp,
    isActing: false,
    didFail: false,
    networkFeePayment: "",
    newForSalePrice: currentForSalePrice ? currentForSalePrice : "",
    parcelContentDoc: parcelContentDoc,
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

  const { newForSalePrice, networkFeePayment } = actionData;

  React.useEffect(() => {
    let _transactionSubtotal = calculateWeiSubtotalField(networkFeePayment);

    updateActionData({ transactionSubtotal: _transactionSubtotal });
  }, [networkFeePayment]);

  function _edit() {
    updateActionData({ isActing: true });

    adminContract.methods
      .updateValue(
        parcelData.landParcel.id,
        Web3.utils.toWei(newForSalePrice),
        networkFeePayment.length > 0 ? Web3.utils.toWei(networkFeePayment) : 0
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
        title="Edit"
        adminContract={adminContract}
        perSecondFeeNumerator={perSecondFeeNumerator}
        perSecondFeeDenominator={perSecondFeeDenominator}
        performAction={_edit}
        actionData={actionData}
        setActionData={setActionData}
        ceramic={ceramic}
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
