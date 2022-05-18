import * as React from "react";
import { ActionData, ActionForm } from "./ActionForm";
import FaucetInfo from "./FaucetInfo";
import { BigNumber, ethers } from "ethers";
import GeoWebCoordinate from "js-geo-web-coordinate";
import { SidebarProps } from "../Sidebar";
import StreamingInfo from "./StreamingInfo";
import { NETWORK_ID, SECONDS_IN_YEAR } from "../../lib/constants";
import { sfInstance } from "../../lib/sfInstance";

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

    console.log(actionData);

    let claimData;

    let actionDataToPassInUserData;

    let userData;

    let txn;

    const filter = claimerContract.filters.ParcelClaimed(null, null);
    const parcels = await claimerContract.queryFilter(filter);
    const existingParcels = parcels.length > 0;
    console.log("existing parcels: ", parcels);

    const sf = await sfInstance(NETWORK_ID, provider);

    const ethx = await sf.loadSuperToken(paymentTokenAddress);

    const approveOperation = await ethx.approve({
      receiver: auctionSuperApp.address,
      amount: ethers.utils.parseEther(displayNewForSalePrice).toString(),
    });

    const newFlowRate = ethers.utils
      .parseEther(displayNewForSalePrice)
      .div(SECONDS_IN_YEAR);

    const signer = provider.getSigner() as any;

    if (existingParcels) {
      // update an exisiting flow
      console.log("Updting an exisiting flow: ");
      const existingLicenseID = parcels[0].args[0].toString();

      claimData = ethers.utils.defaultAbiCoder.encode(
        ["uint256"],
        [existingLicenseID]
      );

      actionDataToPassInUserData = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "bytes"],
        [displayNewForSalePrice, claimData]
      );

      userData = ethers.utils.defaultAbiCoder.encode(
        ["uint8", "bytes"],
        [Action.CLAIM, actionDataToPassInUserData]
      );

      const existingFlow = await sf.cfaV1.getFlow({
        superToken: paymentTokenAddress,
        sender: account,
        receiver: auctionSuperApp.address,
        providerOrSigner: provider as any,
      });

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

      console.log(txn);
    } else {
      // create a new flow
      console.log("Creating a new flow: ");
      claimData = ethers.utils.defaultAbiCoder.encode(
        ["uint64", "uint256[]"],
        [BigNumber.from(baseCoord.toString(10)), path]
      );

      userData = ethers.utils.defaultAbiCoder.encode(
        ["uint8", "bytes"],
        [Action.CLAIM, claimData]
      );

      const flowRate = newFlowRate.toString();

      console.log("flowRate: ", flowRate);

      const createFlowOperation = await sf.cfaV1.createFlow({
        flowRate,
        receiver: auctionSuperApp.address,
        superToken: paymentTokenAddress,
        userData,
      });

      txn = await sf
        .batchCall([approveOperation, createFlowOperation])
        .exec(signer);

      console.log(txn);
    }

    if (!txn) {
      throw new Error(`transaction is undefined: ${txn}`);
    }

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
