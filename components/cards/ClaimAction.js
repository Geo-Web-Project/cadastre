import * as React from "react";
import Web3 from "web3";
import { STATE_PARCEL_SELECTED } from "../Map";
import BN from "bn.js";
import { gql, useLazyQuery } from "@apollo/client";
import { ActionForm, calculateWeiSubtotalField } from "./ActionForm";
import FaucetInfo from "./FaucetInfo";

const GeoWebCoordinate = require("js-geo-web-coordinate");

const newParcelQuery = gql`
  query LandParcel($id: String) {
    landParcel(id: $id) {
      id
    }
  }
`;

function ClaimAction({
  adminContract,
  paymentTokenContract,
  adminAddress,
  account,
  claimBase1Coord,
  claimBase2Coord,
  setInteractionState,
  setSelectedParcelId,
  perSecondFeeNumerator,
  perSecondFeeDenominator,
  ceramic,
}) {
  const [newParcelId, setNewParcelId] = React.useState(null);

  const [getNewParcel, { loading, data, stopPolling }] = useLazyQuery(
    newParcelQuery
  );

  const [actionData, setActionData] = React.useState({
    isActing: false,
    didFail: false,
    networkFeePayment: "",
    newForSalePrice: "",
  });

  function updateActionData(updatedValues) {
    function _updateData(updatedValues) {
      return (prevState) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setActionData(_updateData(updatedValues));
  }

  const { newForSalePrice, networkFeePayment, parcelContentDoc } = actionData;

  React.useEffect(() => {
    if (data == null || data.landParcel == null) {
      return;
    }
    // Stop polling for new parcel
    stopPolling();

    // Load new parcel
    setSelectedParcelId(newParcelId);
    setInteractionState(STATE_PARCEL_SELECTED);

    updateActionData({ isActing: false });
  }, [data]);

  React.useEffect(() => {
    let _transactionSubtotal = calculateWeiSubtotalField(networkFeePayment);

    updateActionData({ transactionSubtotal: _transactionSubtotal });
  }, [networkFeePayment]);

  function _claim(rootCID) {
    updateActionData({ isActing: true });
    if (rootCID == null) {
      updateActionData({ isActing: false, didFail: true });
      return;
    }

    let baseCoord = GeoWebCoordinate.make_gw_coord(
      claimBase1Coord.x,
      claimBase1Coord.y
    );
    let destCoord = GeoWebCoordinate.make_gw_coord(
      claimBase2Coord.x,
      claimBase2Coord.y
    );
    let path = GeoWebCoordinate.make_rect_path(baseCoord, destCoord);
    if (path.length == 0) {
      path = [new BN(0)];
    }

    adminContract.methods
      .claim(
        account,
        baseCoord,
        path,
        Web3.utils.toWei(newForSalePrice),
        Web3.utils.toWei(networkFeePayment),
        rootCID.toString()
      )
      .send({ from: account }, (error, txHash) => {
        if (error) {
          updateActionData({ isActing: false, didFail: true });
        }
      })
      .once("receipt", async function (receipt) {
        let licenseId =
          receipt.events["LicenseInfoUpdated"].returnValues._licenseId;
        let _newParcelId = `0x${new BN(licenseId, 10).toString(16)}`;
        setNewParcelId(_newParcelId);

        getNewParcel({
          variables: { id: _newParcelId },
          pollInterval: 2000,
        });
      })
      .catch(() => {
        updateActionData({ isActing: false });
      });
  }

  return (
    <>
      <ActionForm
        title="Claim"
        adminContract={adminContract}
        perSecondFeeNumerator={perSecondFeeNumerator}
        perSecondFeeDenominator={perSecondFeeDenominator}
        loading={loading}
        performAction={_claim}
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

export default ClaimAction;
