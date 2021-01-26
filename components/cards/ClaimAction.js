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
}) {
  const [newForSalePrice, setNewForSalePrice] = React.useState("");
  const [networkFeePayment, setNetworkFeePayment] = React.useState("");
  const [isActing, setIsActing] = React.useState(false);
  const [didFail, setDidFail] = React.useState(false);
  const [newParcelId, setNewParcelId] = React.useState(null);

  let transactionSubtotal = calculateWeiSubtotalField(networkFeePayment);

  const [getNewParcel, { loading, data, stopPolling }] = useLazyQuery(
    newParcelQuery
  );

  React.useEffect(() => {
    if (data == null || data.landParcel == null) {
      return;
    }
    // Stop polling for new parcel
    stopPolling();

    // Load new parcel
    setSelectedParcelId(newParcelId);
    setInteractionState(STATE_PARCEL_SELECTED);

    setIsActing(false);
  }, [data]);

  function _claim() {
    setIsActing(true);

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
        Web3.utils.toWei(networkFeePayment)
      )
      .send({ from: account }, (error, txHash) => {
        if (error) {
          setDidFail(true);
          setIsActing(false);
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
        setIsActing(false);
      });
  }

  return (
    <>
      <ActionForm
        title="Claim"
        adminContract={adminContract}
        perSecondFeeNumerator={perSecondFeeNumerator}
        perSecondFeeDenominator={perSecondFeeDenominator}
        isActing={isActing}
        loading={loading}
        performAction={_claim}
        setNewForSalePrice={setNewForSalePrice}
        newForSalePrice={newForSalePrice}
        setNetworkFeePayment={setNetworkFeePayment}
        networkFeePayment={networkFeePayment}
        didFail={didFail}
        setDidFail={setDidFail}
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

export default ClaimAction;
