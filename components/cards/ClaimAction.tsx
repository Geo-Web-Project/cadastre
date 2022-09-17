import * as React from "react";
import { ActionData, ActionForm } from "./ActionForm";
import { BigNumber, ethers } from "ethers";
import { GeoWebCoordinate } from "js-geo-web-coordinate";
import BN from "bn.js";
import { SidebarProps } from "../Sidebar";
import StreamingInfo from "./StreamingInfo";
import { SECONDS_IN_YEAR, NETWORK_ID } from "../../lib/constants";
import { fromValueToRate, calculateBufferNeeded } from "../../lib/utils";
import TransactionSummaryView from "./TransactionSummaryView";
import { GW_MAX_LAT, GW_MAX_LON } from "../Map";

export type ClaimActionProps = SidebarProps & {
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  licenseAddress: string;
  /** during the fair launch period (true) or after (false). */
  isFairLaunch?: boolean;
  requiredBid: BigNumber;
};

function ClaimAction(props: ClaimActionProps) {
  const {
    account,
    claimBase1Coord,
    claimBase2Coord,
    registryContract,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    isFairLaunch,
    requiredBid,
    setNewParcel,
    provider,
  } = props;
  const [actionData, setActionData] = React.useState<ActionData>({
    isActing: false,
    didFail: false,
    displayNewForSalePrice: "",
  });
  const [flowOperator, setFlowOperator] = React.useState<string>("");

  const { displayNewForSalePrice } = actionData;

  const isForSalePriceInvalid: boolean =
    displayNewForSalePrice != null &&
    displayNewForSalePrice.length > 0 &&
    isNaN(Number(displayNewForSalePrice));

  const newFlowRate =
    !isForSalePriceInvalid && displayNewForSalePrice
      ? fromValueToRate(
          ethers.utils.parseEther(displayNewForSalePrice),
          perSecondFeeNumerator,
          perSecondFeeDenominator
        )
      : null;

  const networkFeeRatePerYear =
    !isForSalePriceInvalid && displayNewForSalePrice
      ? fromValueToRate(
          ethers.utils.parseEther(displayNewForSalePrice),
          perSecondFeeNumerator.mul(SECONDS_IN_YEAR),
          perSecondFeeDenominator
        )
      : null;

  const requiredBuffer = newFlowRate
    ? calculateBufferNeeded(newFlowRate, NETWORK_ID)
    : null;

  async function _claim() {
    if (!claimBase1Coord || !claimBase2Coord) {
      throw new Error(`Unknown coordinates`);
    }
    const baseCoord = GeoWebCoordinate.fromXandY(
      claimBase1Coord.x,
      claimBase1Coord.y,
      GW_MAX_LON,
      GW_MAX_LAT
    );
    const destCoord = GeoWebCoordinate.fromXandY(
      claimBase2Coord.x,
      claimBase2Coord.y,
      GW_MAX_LON,
      GW_MAX_LAT
    );
    let path = GeoWebCoordinate.makeRectPath(baseCoord, destCoord);
    if (path.length == 0) {
      path = [BigNumber.from(0)];
    }

    if (!displayNewForSalePrice || !newFlowRate || isForSalePriceInvalid) {
      throw new Error(
        `displayNewForSalePrice is invalid: ${displayNewForSalePrice}`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signer = provider.getSigner() as any;

    const txn = await registryContract
      .connect(signer)
      .claim(
        newFlowRate,
        ethers.utils.parseEther(displayNewForSalePrice),
        BigNumber.from(baseCoord.toString()),
        path
      );
    const receipt = await txn.wait();

    const filter = registryContract.filters.ParcelClaimed(null, null);

    const res = await registryContract.queryFilter(
      filter,
      receipt.blockNumber,
      receipt.blockNumber
    );
    const licenseId = res[0].args[0].toString();
    setNewParcel((prev) => {
      return { ...prev, id: `0x${new BN(licenseId.toString()).toString(16)}` };
    });

    return licenseId;
  }

  React.useEffect(() => {
    const _fetchFlowOperator = async () => {
      const _flowOperator = await registryContract.getNextProxyAddress(account);
      setFlowOperator(_flowOperator);
    };

    _fetchFlowOperator();
  }, [registryContract, account]);

  return (
    <>
      <ActionForm
        loading={false}
        performAction={_claim}
        actionData={actionData}
        setActionData={setActionData}
        summaryView={
          networkFeeRatePerYear ? (
            <TransactionSummaryView
              claimPayment={isFairLaunch ? requiredBid : BigNumber.from(0)}
              newAnnualNetworkFee={networkFeeRatePerYear}
              {...props}
            />
          ) : (
            <></>
          )
        }
        requiredPayment={
          isFairLaunch && requiredBuffer
            ? requiredBid.add(requiredBuffer)
            : requiredBuffer
        }
        requiredFlowPermissions={1}
        spender={registryContract.address}
        flowOperator={flowOperator}
        {...props}
      />
      <StreamingInfo
        {...props}
      />
    </>
  );
}

export default ClaimAction;
