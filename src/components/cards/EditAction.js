import * as React from "react";
import Web3 from "web3";
import { STATE_PARCEL_SELECTED } from "../Map";
import ActionForm from "./ActionForm";

const GeoWebCoordinate = require("js-geo-web-coordinate");

function EditAction({
  adminContract,
  account,
  perSecondFeeNumerator,
  perSecondFeeDenominator,
  parcelData,
  refetchParcelData,
  setInteractionState,
}) {
  const [forSalePrice, setForSalePrice] = React.useState("");
  const [networkFeePayment, setNetworkFeePayment] = React.useState("");
  const [isActing, setIsActing] = React.useState(false);
  const [didFail, setDidFail] = React.useState(false);

  function _edit() {
    setIsActing(true);

    adminContract.methods
      .updateValue(
        parcelData.landParcel.id,
        Web3.utils.toWei(forSalePrice),
        networkFeePayment.length > 0 ? Web3.utils.toWei(networkFeePayment) : 0
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
    <ActionForm
      title="Edit"
      adminContract={adminContract}
      perSecondFeeNumerator={perSecondFeeNumerator}
      perSecondFeeDenominator={perSecondFeeDenominator}
      isActing={isActing}
      performAction={_edit}
      setForSalePrice={setForSalePrice}
      forSalePrice={forSalePrice}
      setNetworkFeePayment={setNetworkFeePayment}
      networkFeePayment={networkFeePayment}
      didFail={didFail}
      setDidFail={setDidFail}
      currentForSalePrice={Web3.utils.fromWei(
        parcelData.landParcel.license.value
      )}
      currentExpirationTimestamp={
        parcelData.landParcel.license.expirationTimestamp
      }
    />
  );
}

export default EditAction;
