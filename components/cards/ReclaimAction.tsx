import { useState, useMemo } from "react";
import { ActionData, ActionForm } from "./ActionForm";
import { BigNumber, ethers } from "ethers";
import { GeoWebCoordinate } from "js-geo-web-coordinate";
import { ParcelInfoProps } from "./ParcelInfo";
import { SidebarProps } from "../Sidebar";
import StreamingInfo from "./StreamingInfo";
import { NETWORK_ID, AUCTION_LENGTH } from "../../lib/constants";
import { _calculateAuctionValue } from "./AuctionInfo";
import { fromValueToRate } from "../../lib/utils";
import TransactionSummaryView from "./TransactionSummaryView";
import { GW_MAX_LAT, GW_MAX_LON } from "../Map";
import { formatBalance } from "../../lib/formatBalance";
import { truncateEth } from "../../lib/truncate";

enum Action {
  CLAIM,
  BID,
}

export type ReclaimActionProps = SidebarProps & {
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  requiredBid: BigNumber;
  licenseOwner: string;
  forSalePrice: BigNumber;
  auctionStart: BigNumber;
};

function ReclaimAction(props: ReclaimActionProps) {
  const {
    account,
    licenseOwner,
    paymentToken,
    requiredBid,
    auctionSuperApp,
    provider,
    selectedParcelId,
    forSalePrice,
    auctionStart,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    sfFramework,
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

      /*
  const requiredBid = useMemo(() => {
    if (forSalePrice && auctionStart) {
      return _calculateAuctionValue(forSalePrice, auctionStart, AUCTION_LENGTH);
    }
    return null;
  }, [forSalePrice, auctionStart]);
       */

  async function _reclaim() {
    if (!displayNewForSalePrice || !newNetworkFee || isForSalePriceInvalid) {
      throw new Error(
        `displayNewForSalePrice is invalid: ${displayNewForSalePrice}`
      );
    }

    const claimData = ethers.utils.defaultAbiCoder.encode(
      ["uint256"],
      [selectedParcelId]
    );

    const actionDataToPassInUserData = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "bytes"],
      [ethers.utils.parseEther(displayNewForSalePrice), claimData]
    );

    const userData = ethers.utils.defaultAbiCoder.encode(
      ["uint8", "bytes"],
      [Action.BID, actionDataToPassInUserData]
    );

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

    const newFlowRate = newNetworkFee;

    const signer = provider.getSigner() as any;

    const updateFlowOperation = sfFramework.cfaV1.updateFlow({
      flowRate: BigNumber.from(existingFlow.flowRate)
        .add(newFlowRate)
        .toString(),
      receiver: auctionSuperApp.address,
      superToken: paymentToken.address,
      userData,
    });

    const txn = await sfFramework
      .batchCall([approveOperation, updateFlowOperation])
      .exec(signer);

    if (!txn) {
      throw new Error(`transaction is undefined: ${txn}`);
    }

    const receipt = await txn.wait();
    setInteractionState(STATE.PARCEL_SELECTED);

    return selectedParcelId;
  }

  return (
    <>
      <ActionForm
        loading={false}
        performAction={_reclaim}
        actionData={actionData}
        setActionData={setActionData}
        summaryView={
          newNetworkFee ? (
            <TransactionSummaryView
              claimPayment={account.toLowerCase() == licenseOwner.toLowerCase()  ? BigNumber.from("0") : requiredBid}
              newNetworkFee={newNetworkFee}
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

export default ReclaimAction;
