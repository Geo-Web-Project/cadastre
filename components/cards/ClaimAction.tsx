import * as React from "react";
import { ActionData, ActionForm, fromValueToRate } from "./ActionForm";
import FaucetInfo from "./FaucetInfo";
import { BigNumber } from "ethers";
import GeoWebCoordinate from "js-geo-web-coordinate";
import { SidebarProps } from "../Sidebar";
import StreamingInfo from "./StreamingInfo";
import { calculateWeiSubtotalField } from "../../lib/calculateWeiSubtotalField";

export type ClaimActionProps = SidebarProps & {
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  basicProfileStreamManager: any;
  licenseAddress: string;
};

function ClaimAction(props: ClaimActionProps) {
  const {
    account,
    paymentTokenAddress,
    claimBase1Coord,
    claimBase2Coord,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    claimerContract,
  } = props;
  const [actionData, setActionData] = React.useState<ActionData>({
    isActing: false,
    didFail: false,
    displayNewForSalePrice: "",
  });

  const {
    displayNewForSalePrice,
    // displayNetworkFeePayment
  } = actionData;

  // React.useEffect(() => {
  //   const _transactionSubtotal = calculateWeiSubtotalField(
  //     displayNetworkFeePayment
  //   );

  //   updateActionData({ transactionSubtotal: _transactionSubtotal });
  // }, [displayNetworkFeePayment]);

  async function _claim() {
    const baseCoord = GeoWebCoordinate.make_gw_coord(
      claimBase1Coord.x,
      claimBase1Coord.y
    );
    const destCoord = GeoWebCoordinate.make_gw_coord(
      claimBase2Coord.x,
      claimBase2Coord.y
    );
    let path = GeoWebCoordinate.make_rect_path(baseCoord, destCoord);
    path.map(
      // FIXME: it should be 'BN' type, waiting for js-geo-web-coordinate upgrade.
      (v: any) => {
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
      newContributionRate,
      // baseCoord.toString(10),
      path,
      {
        from: account,
        // value: calculateWeiSubtotalField(displayNetworkFeePayment),
      }
    );
    const receipt = await resp?.wait();
    const filter = claimerContract.filters.ParcelClaimed(null, null);
    const res = await claimerContract.queryFilter(
      filter,
      receipt.blockNumber,
      receipt.blockNumber
    );
    const licenseId = res[0].args[0].toString();
    return licenseId;
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
