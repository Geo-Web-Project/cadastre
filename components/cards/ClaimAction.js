import * as React from "react";
import {
  ActionForm,
  calculateWeiSubtotalField,
  fromValueToRate,
} from "./ActionForm";
import FaucetInfo from "./FaucetInfo";
import { ethers, BigNumber } from "ethers";

const GeoWebCoordinate = require("js-geo-web-coordinate");

function ClaimAction({
  claimerContract,
  collectorContract,
  account,
  claimBase1Coord,
  claimBase2Coord,
  setInteractionState,
  setSelectedParcelId,
  perSecondFeeNumerator,
  perSecondFeeDenominator,
  basicProfileStreamManager,
  licenseAddress,
  ceramic,
}) {
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
    return licenseId;
  }

  return (
    <>
      <ActionForm
        title="Claim"
        collectorContract={collectorContract}
        perSecondFeeNumerator={perSecondFeeNumerator}
        perSecondFeeDenominator={perSecondFeeDenominator}
        loading={false}
        performAction={_claim}
        actionData={actionData}
        setActionData={setActionData}
        basicProfileStreamManager={basicProfileStreamManager}
        setInteractionState={setInteractionState}
        licenseAddress={licenseAddress}
        ceramic={ceramic}
        setSelectedParcelId={setSelectedParcelId}
      />
      <FaucetInfo></FaucetInfo>
    </>
  );
}

export default ClaimAction;
