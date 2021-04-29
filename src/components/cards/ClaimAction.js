import * as React from "react";
import { STATE_PARCEL_SELECTED } from "../Map";
import { gql, useLazyQuery } from "@apollo/client";
import { ActionForm, calculateWeiSubtotalField } from "./ActionForm";
import FaucetInfo from "./FaucetInfo";
import { ethers, BigNumber } from "ethers";
import BN from "bn.js";

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
}) {
  const [newParcelId, setNewParcelId] = React.useState(null);

  const [getNewParcel, { loading, data, stopPolling }] = useLazyQuery(
    newParcelQuery
  );

  const [actionData, setActionData] = React.useState({
    isActing: false,
    didFail: false,
    displayNetworkFeePayment: "",
    displayNewForSalePrice: "",
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
    let _transactionSubtotal = calculateWeiSubtotalField(
      displayNetworkFeePayment
    );

    updateActionData({ transactionSubtotal: _transactionSubtotal });
  }, [displayNetworkFeePayment]);

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
    let path = GeoWebCoordinate.make_rect_path(baseCoord, destCoord).map(
      (v) => {
        return BigNumber.from(v.toString(10));
      }
    );
    if (path.length == 0) {
      path = [BigNumber.from(0)];
    }

    adminContract
      .claim(
        account,
        baseCoord.toString(10),
        path,
        calculateWeiSubtotalField(displayNewForSalePrice),
        calculateWeiSubtotalField(displayNetworkFeePayment),
        rootCID.toString(),
        { from: account }
      )
      .then((resp) => {
        return resp.wait();
      })
      .then((receipt) => {
        const filter = adminContract.filters.LicenseInfoUpdated(
          null,
          null,
          null
        );
        return adminContract.queryFilter(
          filter,
          receipt.blockNumber,
          receipt.blockNumber
        );
      })
      .then((res) => {
        let licenseId = res[0].args[0];
        let _newParcelId = `0x${new BN(licenseId.toString()).toString(16)}`;
        setNewParcelId(_newParcelId);

        getNewParcel({
          variables: { id: _newParcelId },
          pollInterval: 2000,
        });
      })
      .catch((error) => {
        console.log(error);
        updateActionData({ isActing: false, didFail: true });
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
        parcelRootStreamManager={parcelRootStreamManager}
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
