import * as React from "react";
import { BigNumber, ethers } from "ethers";
import { ActionData, ActionForm } from "./ActionForm";
import { formatBalance } from "../../lib/formatBalance";
import { SidebarProps } from "../Sidebar";
import TransactionSummaryView from "./TransactionSummaryView";
import { fromValueToRate } from "../../lib/utils";
import { BasicProfileStreamManager } from "../../lib/stream-managers/BasicProfileStreamManager";
import { NETWORK_ID } from "../../lib/constants";
import { sfInstance } from "../../lib/sfInstance";
import StreamingInfo from "./StreamingInfo";

export type EditActionProps = SidebarProps & {
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  basicProfileStreamManager: BasicProfileStreamManager | null;
  licenseAddress: string;
  hasOutstandingBid: boolean;
  parcelData: any;
};

enum Action {
  CLAIM,
  BID,
}

function EditAction(props: EditActionProps) {
  const {
    parcelData,
    provider,
    basicProfileStreamManager,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    selectedParcelId,
    paymentToken,
    account,
    auctionSuperApp,
    hasOutstandingBid,
  } = props;
  const displayCurrentForSalePrice = formatBalance(
    parcelData.landParcel.license.currentOwnerBid.forSalePrice
  );

  const parcelContent = basicProfileStreamManager
    ? basicProfileStreamManager.getStreamContent()
    : null;
  const [actionData, setActionData] = React.useState<ActionData>({
    displayCurrentForSalePrice: displayCurrentForSalePrice,
    isActing: false,
    didFail: false,
    displayNewForSalePrice: displayCurrentForSalePrice
      ? displayCurrentForSalePrice
      : "",
    parcelName: parcelContent ? parcelContent.name : undefined,
    parcelWebContentURI: parcelContent ? parcelContent.url : undefined,
  });

  function updateActionData(updatedValues: ActionData) {
    function _updateData(updatedValues: ActionData) {
      return (prevState: ActionData) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setActionData(_updateData(updatedValues));
  }

  const { displayNewForSalePrice } = actionData;

  const isForSalePriceInvalid: boolean =
    displayNewForSalePrice != null &&
    displayNewForSalePrice.length > 0 &&
    isNaN(Number(displayNewForSalePrice));

  const existingNetworkFee =
    displayCurrentForSalePrice &&
    perSecondFeeNumerator &&
    perSecondFeeDenominator
      ? fromValueToRate(
          ethers.utils.parseEther(displayCurrentForSalePrice),
          perSecondFeeNumerator,
          perSecondFeeDenominator
        )
      : null;

  const newNetworkFee =
    !isForSalePriceInvalid &&
    displayNewForSalePrice &&
    perSecondFeeNumerator &&
    perSecondFeeDenominator
      ? fromValueToRate(
          ethers.utils.parseEther(displayNewForSalePrice),
          perSecondFeeNumerator,
          perSecondFeeDenominator
        )
      : null;

  async function _edit() {
    updateActionData({ isActing: true });

    if (!existingNetworkFee) {
      throw new Error("Could not find existingNetworkFee");
    }

    // Check for changes
    if (
      !displayNewForSalePrice ||
      !newNetworkFee ||
      displayNewForSalePrice == displayCurrentForSalePrice
    ) {
      // Content change only
      return;
    }

    const sf = await sfInstance(NETWORK_ID, provider);

    const bidData = ethers.utils.defaultAbiCoder.encode(
      ["uint256"],
      [selectedParcelId]
    );

    const actionData = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "bytes"],
      [ethers.utils.parseEther(displayNewForSalePrice), bidData]
    );

    const userData = ethers.utils.defaultAbiCoder.encode(
      ["uint8", "bytes"],
      [Action.BID, actionData]
    );

    const existingFlow = await sf.cfaV1.getFlow({
      superToken: paymentToken.address,
      sender: account,
      receiver: auctionSuperApp.address,
      providerOrSigner: provider as any,
    });

    const signer = provider.getSigner() as any;

    const networkFeeDelta = newNetworkFee.sub(existingNetworkFee);

    const updateFlowOperation = await sf.cfaV1.updateFlow({
      flowRate: BigNumber.from(existingFlow.flowRate)
        .add(networkFeeDelta)
        .toString(),
      receiver: auctionSuperApp.address,
      superToken: paymentToken.address,
      userData,
    });

    const txn = await updateFlowOperation.exec(signer);

    await txn.wait();
  }

  return (
    <>
      <ActionForm
        loading={false}
        performAction={_edit}
        actionData={actionData}
        setActionData={setActionData}
        summaryView={
          existingNetworkFee && !hasOutstandingBid ? (
            <TransactionSummaryView
              existingNetworkFee={existingNetworkFee}
              newNetworkFee={newNetworkFee ?? existingNetworkFee}
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

export default EditAction;
