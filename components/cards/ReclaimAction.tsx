import { useState } from "react";
import { BigNumber, ethers } from "ethers";
import { ActionData, ActionForm } from "./ActionForm";
import { SidebarProps } from "../Sidebar";
import StreamingInfo from "./StreamingInfo";
import { fromValueToRate, calculateBufferNeeded } from "../../lib/utils";
import TransactionSummaryView from "./TransactionSummaryView";
import { SECONDS_IN_YEAR, NETWORK_ID } from "../../lib/constants";
import type { PCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/PCOLicenseDiamond";
import BN from "bn.js";

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
    selectedParcelId,
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

  function updateActionData(updatedValues: ActionData) {
    function _updateData(updatedValues: ActionData) {
      return (prevState: ActionData) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setActionData(_updateData(updatedValues));
  }

  async function _reclaim() {
    updateActionData({ isActing: true });

    if (!licenseDiamondContract) {
      throw new Error("Could not find licenseDiamondContract");
    }

    if (!displayNewForSalePrice || !newNetworkFee || isForSalePriceInvalid) {
      throw new Error(
        `displayNewForSalePrice is invalid: ${displayNewForSalePrice}`
      );
    }

    const txn = await licenseDiamondContract.reclaim(
      newNetworkFee,
      ethers.utils.parseEther(displayNewForSalePrice)
    );
    await txn.wait();

    return new BN(selectedParcelId.split("x")[1], 16).toString(10);
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
