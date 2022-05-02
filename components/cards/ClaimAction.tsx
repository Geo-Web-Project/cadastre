import * as React from "react";
import { ActionData, ActionForm, fromValueToRate } from "./ActionForm";
import FaucetInfo from "./FaucetInfo";
import { ethers, BigNumber } from "ethers";
import { SidebarProps } from "../Sidebar";
import StreamingInfo from "./StreamingInfo";

const GeoWebCoordinate = require("js-geo-web-coordinate");

export type ClaimActionProps = SidebarProps & {
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  basicProfileStreamManager: any;
  licenseAddress: string;
};

function ClaimAction(props: ClaimActionProps) {
  const { account, paymentTokenAddress } = props;
  const [actionData, setActionData] = React.useState<ActionData>({
    isActing: false,
    didFail: false,
    displayNewForSalePrice: "",
  });

  function updateActionData(updatedValues: any) {
    function _updateData(updatedValues: any) {
      return (prevState: any) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setActionData(_updateData(updatedValues));
  }

  // const { displayNewForSalePrice, displayNetworkFeePayment } = actionData;

  // React.useEffect(() => {
  //   let _transactionSubtotal = calculateWeiSubtotalField(
  //     displayNetworkFeePayment
  //   );

  //   updateActionData({ transactionSubtotal: _transactionSubtotal });
  // }, [displayNetworkFeePayment]);

  async function _claim() {
    // FIXME: Update for streaming payments
    // updateActionData({ isActing: true });
    // let baseCoord = GeoWebCoordinate.make_gw_coord(
    //   claimBase1Coord.x,
    //   claimBase1Coord.y
    // );
    // let destCoord = GeoWebCoordinate.make_gw_coord(
    //   claimBase2Coord.x,
    //   claimBase2Coord.y
    // );
    // let path = GeoWebCoordinate.make_rect_path(baseCoord, destCoord).map(
    //   (v) => {
    //     return BigNumber.from(v.toString(10));
    //   }
    // );
    // if (path.length == 0) {
    //   path = [BigNumber.from(0)];
    // }
    // const newValue = calculateWeiSubtotalField(displayNewForSalePrice);
    // const newContributionRate = fromValueToRate(
    //   newValue,
    //   perSecondFeeNumerator,
    //   perSecondFeeDenominator
    // );
    // const resp = await claimerContract.claim(
    //   account,
    //   baseCoord.toString(10),
    //   path,
    //   newContributionRate,
    //   {
    //     from: account,
    //     value: calculateWeiSubtotalField(displayNetworkFeePayment),
    //   }
    // );
    // const receipt = await resp.wait();
    // const filter = claimerContract.filters.ParcelClaimed(null, null);
    // const res = await claimerContract.queryFilter(
    //   filter,
    //   receipt.blockNumber,
    //   receipt.blockNumber
    // );
    // let licenseId = res[0].args[0];
    // return licenseId;
    return "";
  }

  return (
    <>
      <ActionForm
        loading={false}
        performAction={_claim}
        actionData={actionData}
        setActionData={setActionData}
        {...props}
      />
      <FaucetInfo />
      <StreamingInfo
        account={account}
        paymentTokenAddress={paymentTokenAddress}
      />
    </>
  );
}

export default ClaimAction;
