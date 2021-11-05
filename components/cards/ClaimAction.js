import * as React from "react";
import { STATE_PARCEL_SELECTED } from "../Map";
import { gql, useLazyQuery } from "@apollo/client";
import {
  ActionForm,
  calculateWeiSubtotalField,
  fromValueToRate,
} from "./ActionForm";
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
  claimerContract,
  collectorContract,
  adminAddress,
  account,
  claimBase1Coord,
  claimBase2Coord,
  setInteractionState,
  setSelectedParcelId,
  perSecondFeeNumerator,
  perSecondFeeDenominator,
  parcelIndexManager,
  basicProfileStreamManager,
}) {
  const [newParcelId, setNewParcelId] = React.useState(null);

  const [getNewParcel, { loading, data, stopPolling }] =
    useLazyQuery(newParcelQuery);

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

  async function _claim() {
    updateActionData({ isActing: true });

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

    try {
      const newValue = calculateWeiSubtotalField(displayNewForSalePrice);
      const newContributionRate = fromValueToRate(
        newValue,
        perSecondFeeNumerator,
        perSecondFeeDenominator
      );
      const resp = await claimerContract.claim(
        account,
        baseCoord.toString(10),
        path,
        newContributionRate,
        {
          from: account,
          value: calculateWeiSubtotalField(displayNetworkFeePayment),
        }
      );

      const receipt = await resp.wait();

      const filter = claimerContract.filters.ParcelClaimed(null, null);
      const res = await claimerContract.queryFilter(
        filter,
        receipt.blockNumber,
        receipt.blockNumber
      );

      let licenseId = res[0].args[0];
      let _newParcelId = `0x${new BN(licenseId.toString()).toString(16)}`;
      setNewParcelId(_newParcelId);

      getNewParcel({
        variables: { id: _newParcelId },
        pollInterval: 2000,
      });

      return licenseId;
    } catch (error) {
      console.log(error);
      updateActionData({ isActing: false, didFail: true });
    }
  }

  return (
    <>
      <ActionForm
        title="Claim"
        collectorContract={collectorContract}
        perSecondFeeNumerator={perSecondFeeNumerator}
        perSecondFeeDenominator={perSecondFeeDenominator}
        loading={loading}
        performAction={_claim}
        actionData={actionData}
        setActionData={setActionData}
        parcelIndexManager={parcelIndexManager}
        basicProfileStreamManager={basicProfileStreamManager}
        setInteractionState={setInteractionState}
      />
      <FaucetInfo account={account} adminAddress={adminAddress}></FaucetInfo>
    </>
  );
}

export default ClaimAction;
