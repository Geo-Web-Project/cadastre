import { useState } from "react";
import { BigNumber, ethers } from "ethers";
import { ActionData, ActionForm } from "./ActionForm";
import { SidebarProps } from "../Sidebar";
import StreamingInfo from "./StreamingInfo";
import { fromValueToRate, calculateBufferNeeded } from "../../lib/utils";
import TransactionSummaryView from "./TransactionSummaryView";
import { SECONDS_IN_YEAR, NETWORK_ID } from "../../lib/constants";
import type { PCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/PCOLicenseDiamond";

export type ReclaimActionProps = SidebarProps & {
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  requiredBid?: BigNumber;
  licenseOwner: string;
  licenseDiamondContract: PCOLicenseDiamond | null;
};

function ReclaimAction(props: ReclaimActionProps) {
  const {
    account,
    licenseOwner,
    paymentToken,
    requiredBid,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    licenseDiamondContract,
    registryContract,
  } = props;

  const [actionData, setActionData] = useState<ActionData>({
    isActing: false,
    didFail: false,
    displayNewForSalePrice: "",
  });

  const { displayNewForSalePrice } = actionData;

  const isForSalePriceInvalid: boolean =
    displayNewForSalePrice != null &&
    displayNewForSalePrice.length > 0 &&
    isNaN(Number(displayNewForSalePrice));

  const newNetworkFee =
    !isForSalePriceInvalid && displayNewForSalePrice
      ? fromValueToRate(
          ethers.utils.parseEther(displayNewForSalePrice),
          perSecondFeeNumerator,
          perSecondFeeDenominator
        )
      : null;

  const newAnnualNetworkFee =
    !isForSalePriceInvalid && displayNewForSalePrice
      ? fromValueToRate(
          ethers.utils.parseEther(displayNewForSalePrice),
          perSecondFeeNumerator.mul(SECONDS_IN_YEAR),
          perSecondFeeDenominator
        )
      : null;

  const requiredBuffer = newNetworkFee
    ? calculateBufferNeeded(newNetworkFee, NETWORK_ID)
    : null;

  async function _reclaim() {
    if (!licenseDiamondContract) {
      throw new Error("Could not find licenseDiamondContract");
    }

    if (!displayNewForSalePrice || !newNetworkFee || isForSalePriceInvalid) {
      throw new Error(
        `displayNewForSalePrice is invalid: ${displayNewForSalePrice}`
      );
    }

    // TODO: Add new reclaimer
    throw new Error("TODO: Implement Reclaimer");

    {
      /* const claimData = ethers.utils.defaultAbiCoder.encode(
      ["uint256"],
      [selectedParcelId]
    );

    const actionDataToPassInUserData = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "bytes"],
      [ethers.utils.parseEther(displayNewForSalePrice), claimData]
    );

    let userData;
    let txn;

    const existingFlow = await sfFramework.cfaV1.getFlow({
      superToken: paymentToken.address,
      sender: account,
      receiver: auctionSuperApp.address,
      providerOrSigner: provider as any,
    });

    const approveOperation = paymentToken.approve({
      receiver: auctionSuperApp.address,
      amount: ethers.utils.parseEther(displayNewForSalePrice).toString(),
    });

    const signer = provider.getSigner() as any;

    if (existingFlow.flowRate !== "0") {
      //update an exisiting flow

      userData = ethers.utils.defaultAbiCoder.encode(
        ["uint8", "bytes"],
        [Action.BID, actionDataToPassInUserData]
      );

      const updateFlowOperation = sfFramework.cfaV1.updateFlow({
        flowRate: BigNumber.from(existingFlow.flowRate)
          .add(newNetworkFee)
          .toString(),
        receiver: auctionSuperApp.address,
        superToken: paymentToken.address,
        userData,
      });

      txn = await sfFramework
        .batchCall([approveOperation, updateFlowOperation])
        .exec(signer);
    } else {
      // create a new flow

      userData = ethers.utils.defaultAbiCoder.encode(
        ["uint8", "bytes"],
        [Action.BID, actionDataToPassInUserData]
      );

      const createFlowOperation = sfFramework.cfaV1.createFlow({
        flowRate: newNetworkFee.toString(),
        receiver: auctionSuperApp.address,
        superToken: paymentToken.address,
        userData,
      });

      txn = await sfFramework
        .batchCall([approveOperation, createFlowOperation])
        .exec(signer);
    }

    if (!txn) {
      throw new Error(`transaction is undefined: ${txn}`);
    }

    await txn.wait();

    return BigNumber.from(selectedParcelId).toNumber(); */
    }
  }

  return (
    <>
      <ActionForm
        licenseAddress={registryContract.address}
        loading={false}
        performAction={_reclaim}
        actionData={actionData}
        setActionData={setActionData}
        summaryView={
          newAnnualNetworkFee ? (
            <TransactionSummaryView
              claimPayment={
                account.toLowerCase() == licenseOwner?.toLowerCase()
                  ? BigNumber.from("0")
                  : requiredBid
              }
              newAnnualNetworkFee={newAnnualNetworkFee}
              {...props}
            />
          ) : (
            <></>
          )
        }
        requiredPayment={
          requiredBid && requiredBuffer
            ? requiredBid.add(requiredBuffer)
            : requiredBuffer
        }
        requiredFlowPermissions={1}
        spender={licenseDiamondContract?.address || null}
        flowOperator={licenseDiamondContract?.address || null}
        {...props}
      />
      <StreamingInfo account={account} paymentToken={paymentToken} />
    </>
  );
}

export default ReclaimAction;
