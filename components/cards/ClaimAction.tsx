import * as React from "react";
import { ActionData, ActionForm } from "./ActionForm";
import { BigNumber, ethers } from "ethers";
import { GeoWebCoordinate } from "js-geo-web-coordinate";
import { SidebarProps } from "../Sidebar";
import StreamingInfo from "./StreamingInfo";
import { NETWORK_ID } from "../../lib/constants";
import { sfInstance } from "../../lib/sfInstance";
import { fromValueToRate } from "../../lib/utils";
import TransactionSummaryView from "./TransactionSummaryView";
import { GW_MAX_LAT, GW_MAX_LON } from "../Map";

enum Action {
  CLAIM,
  BID,
}

export type ClaimActionProps = SidebarProps & {
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  licenseAddress: string;
  /** during the fair launch period (true) or after (false). */
  isFairLaunch?: boolean;
  currentRequiredBid: string;
};

function ClaimAction(props: ClaimActionProps) {
  const {
    account,
    paymentToken,
    claimBase1Coord,
    claimBase2Coord,
    claimerContract,
    auctionSuperApp,
    provider,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
  } = props;
  const [actionData, setActionData] = React.useState<ActionData>({
    isActing: false,
    didFail: false,
    displayNewForSalePrice: "",
  });

  const { displayNewForSalePrice } = actionData;

  const isForSalePriceInvalid: boolean =
    displayNewForSalePrice != null &&
    displayNewForSalePrice.length > 0 &&
    isNaN(Number(displayNewForSalePrice));

  const networkFeeRatePerSecond =
    !isForSalePriceInvalid && displayNewForSalePrice
      ? fromValueToRate(
          ethers.utils.parseEther(displayNewForSalePrice),
          perSecondFeeNumerator,
          perSecondFeeDenominator
        )
      : null;

  async function _claim() {
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

    if (
      !displayNewForSalePrice ||
      !networkFeeRatePerSecond ||
      isForSalePriceInvalid
    ) {
      throw new Error(
        `displayNewForSalePrice is invalid: ${displayNewForSalePrice}`
      );
    }

    const claimData = ethers.utils.defaultAbiCoder.encode(
      ["uint64", "uint256[]"],
      [BigNumber.from(baseCoord.toString()), path]
    );

    const actionDataToPassInUserData = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "bytes"],
      [ethers.utils.parseEther(displayNewForSalePrice), claimData]
    );

    let userData;

    let txn;

    const sf = await sfInstance(NETWORK_ID, provider);

    const existingFlow = await sf.cfaV1.getFlow({
      superToken: paymentToken.address,
      sender: account,
      receiver: auctionSuperApp.address,
      providerOrSigner: provider as any,
    });

    const approveOperation = await paymentToken.approve({
      receiver: auctionSuperApp.address,
      amount: ethers.utils.parseEther(displayNewForSalePrice).toString(),
    });

    const newFlowRate = networkFeeRatePerSecond;

    const signer = provider.getSigner() as any;

    if (existingFlow.flowRate !== "0") {
      // update an exisiting flow

      userData = ethers.utils.defaultAbiCoder.encode(
        ["uint8", "bytes"],
        [Action.CLAIM, actionDataToPassInUserData]
      );

      const updateFlowOperation = await sf.cfaV1.updateFlow({
        flowRate: BigNumber.from(existingFlow.flowRate)
          .add(newFlowRate)
          .toString(),
        receiver: auctionSuperApp.address,
        superToken: paymentToken.address,
        userData,
      });

      txn = await sf
        .batchCall([approveOperation, updateFlowOperation])
        .exec(signer);
    } else {
      // create a new flow

      userData = ethers.utils.defaultAbiCoder.encode(
        ["uint8", "bytes"],
        [Action.CLAIM, actionDataToPassInUserData]
      );

      const flowRate = newFlowRate.toString();

      const createFlowOperation = await sf.cfaV1.createFlow({
        flowRate,
        receiver: auctionSuperApp.address,
        superToken: paymentToken.address,
        userData,
      });

      txn = await sf
        .batchCall([approveOperation, createFlowOperation])
        .exec(signer);
    }

    if (!txn) {
      throw new Error(`transaction is undefined: ${txn}`);
    }

    const receipt = await txn.wait();

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
        summaryView={
          networkFeeRatePerSecond ? (
            <TransactionSummaryView
              newNetworkFee={networkFeeRatePerSecond}
              {...props}
            />
          ) : (
            <></>
          )
        }
        {...props}
      />
      <StreamingInfo account={account} paymentToken={paymentToken} />
    </>
  );
}

export default ClaimAction;
