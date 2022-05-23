import * as React from "react";
import { ActionData, ActionForm } from "./ActionForm";
import FaucetInfo from "./FaucetInfo";
import { BigNumber, ethers } from "ethers";
import GeoWebCoordinate from "js-geo-web-coordinate";
import { SidebarProps } from "../Sidebar";
import StreamingInfo from "./StreamingInfo";
import { NETWORK_ID } from "../../lib/constants";
import { sfInstance } from "../../lib/sfInstance";
import { fromValueToRate } from "../../lib/utils";

enum Action {
  CLAIM,
  BID,
}

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
    claimerContract,
    auctionSuperApp,
    provider,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    isFairLaunch = false,
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
    let path = GeoWebCoordinate.make_rect_path(baseCoord, destCoord).map(
      // FIXME: it should be 'BN' type, waiting for js-geo-web-coordinate upgrade.
      (v: any) => {
        return BigNumber.from(v.toString(10));
      }
    );
    if (path.length == 0) {
      path = [BigNumber.from(0)];
    }

    if (!displayNewForSalePrice) {
      throw new Error(
        `displayNewForSalePrice is invalid: ${displayNewForSalePrice}`
      );
    }

    const claimData = ethers.utils.defaultAbiCoder.encode(
      ["uint64", "uint256[]"],
      [BigNumber.from(baseCoord.toString(10)), path]
    );

    const actionDataToPassInUserData = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "bytes"],
      [ethers.utils.parseEther(displayNewForSalePrice), claimData]
    );

    let userData;

    let txn;

    const sf = await sfInstance(NETWORK_ID, provider);

    const ethx = await sf.loadSuperToken(paymentTokenAddress);

    const existingFlow = await sf.cfaV1.getFlow({
      superToken: paymentTokenAddress,
      sender: account,
      receiver: auctionSuperApp.address,
      providerOrSigner: provider as any,
    });

    const approveOperation = await ethx.approve({
      receiver: auctionSuperApp.address,
      amount: ethers.utils.parseEther(displayNewForSalePrice).toString(),
    });

    const networkFeeRatePerSecond = fromValueToRate(
      ethers.utils.parseEther(displayNewForSalePrice),
      perSecondFeeNumerator,
      perSecondFeeDenominator
    );

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
        superToken: paymentTokenAddress,
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
        superToken: paymentTokenAddress,
        userData,
      });

      txn = await sf
        .batchCall([approveOperation, createFlowOperation])
        .exec(signer);
    }

    if (!txn) {
      throw new Error(`transaction is undefined: ${txn}`);
    }

    const filter = claimerContract.filters.ParcelClaimed(null, null);

    const res = await claimerContract.queryFilter(
      filter,
      txn.blockNumber,
      txn.blockNumber
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
        isFairLaunch={isFairLaunch}
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
