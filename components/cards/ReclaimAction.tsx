import * as React from "react";
import { BigNumber, ethers } from "ethers";
import { BasicProfileStreamManager } from "../../lib/stream-managers/BasicProfileStreamManager";
import { ActionData, ActionForm } from "./ActionForm";
import { SidebarProps, ParcelFieldsToUpdate } from "../Sidebar";
import StreamingInfo from "./StreamingInfo";
import { fromValueToRate, calculateBufferNeeded } from "../../lib/utils";
import TransactionSummaryView from "./TransactionSummaryView";
import { SECONDS_IN_YEAR } from "../../lib/constants";
import type { PCOLicenseDiamondABI as PCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/PCOLicenseDiamondABI";
import BN from "bn.js";

export type ReclaimActionProps = SidebarProps & {
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  basicProfileStreamManager: BasicProfileStreamManager | null;
  requiredBid?: BigNumber;
  licenseOwner: string;
  licenseDiamondContract: PCOLicenseDiamond | null;
  setParcelFieldsToUpdate: React.Dispatch<
    React.SetStateAction<ParcelFieldsToUpdate | null>
  >;
  minForSalePrice: BigNumber;
};

function ReclaimAction(props: ReclaimActionProps) {
  const {
    account,
    provider,
    basicProfileStreamManager,
    licenseOwner,
    requiredBid,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    licenseDiamondContract,
    registryContract,
    selectedParcelId,
    sfFramework,
    paymentToken,
    setParcelFieldsToUpdate,
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

  const [requiredBuffer, setRequiredBuffer] =
    React.useState<BigNumber | null>(null);

  React.useEffect(() => {
    const run = async () => {
      if (!newNetworkFee) {
        setRequiredBuffer(null);
        return;
      }

      const _bufferNeeded = await calculateBufferNeeded(
        sfFramework,
        paymentToken,
        newNetworkFee
      );
      setRequiredBuffer(_bufferNeeded);
    };

    run();
  }, [sfFramework, paymentToken, displayNewForSalePrice]);

  React.useEffect(() => {
    const parcelContent = basicProfileStreamManager
      ? basicProfileStreamManager.getStreamContent()
      : null;

    if (parcelContent && licenseOwner === account) {
      updateActionData({
        parcelName: parcelContent.name,
        parcelWebContentURI: parcelContent.url,
      });
    }
  }, [basicProfileStreamManager]);

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

    const txn = await licenseDiamondContract
      .connect(provider.getSigner())
      .reclaim(
        ethers.utils.parseEther(displayNewForSalePrice),
        newNetworkFee,
        ethers.utils.parseEther(displayNewForSalePrice)
      );
    await txn.wait();

    setParcelFieldsToUpdate({
      forSalePrice: true,
      licenseOwner: licenseOwner !== account,
    });

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
              newNetworkFee={newNetworkFee}
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
      <StreamingInfo {...props} />
    </>
  );
}

export default ReclaimAction;
