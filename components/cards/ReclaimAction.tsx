import * as React from "react";
import { BigNumber, ethers } from "ethers";
import BN from "bn.js";
import type { IPCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/IPCOLicenseDiamond";
import type { BasicProfile } from "@geo-web/types";
import { ActionData, ActionForm } from "./ActionForm";
import { ParcelFieldsToUpdate } from "../OffCanvasPanel";
import { ParcelInfoProps } from "./ParcelInfo";
import StreamingInfo from "./StreamingInfo";
import TransactionSummaryView from "./TransactionSummaryView";
import { fromValueToRate, calculateBufferNeeded } from "../../lib/utils";
import { SECONDS_IN_YEAR } from "../../lib/constants";

export type ReclaimActionProps = ParcelInfoProps & {
  signer: ethers.Signer;
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  requiredBid?: BigNumber;
  licenseOwner: string;
  licenseDiamondContract: IPCOLicenseDiamond | null;
  setParcelFieldsToUpdate: React.Dispatch<
    React.SetStateAction<ParcelFieldsToUpdate | null>
  >;
  minForSalePrice: BigNumber;
  parcelContent: BasicProfile | null;
  setShouldParcelContentUpdate: React.Dispatch<React.SetStateAction<boolean>>;
  setRootCid: React.Dispatch<React.SetStateAction<string | null>>;
};

function ReclaimAction(props: ReclaimActionProps) {
  const {
    account,
    signer,
    licenseOwner,
    requiredBid,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    licenseDiamondContract,
    selectedParcelId,
    sfFramework,
    paymentToken,
    parcelContent,
  } = props;

  const [actionData, setActionData] = React.useState<ActionData>({
    isActing: false,
    didFail: false,
    displayNewForSalePrice: "",
  });
  const [requiredBuffer, setRequiredBuffer] = React.useState<BigNumber | null>(
    null
  );
  const [transactionBundleFeesEstimate, setTransactionBundleFeesEstimate] =
    React.useState<BigNumber | null>(null);

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
  const isOwner = account === licenseOwner;

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
    if (parcelContent && isOwner) {
      updateActionData({
        parcelName: parcelContent.name,
        parcelWebContentURI: parcelContent.url,
      });
    }
  }, [parcelContent]);

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

    if (!signer) {
      throw new Error("Could not find signer");
    }

    let txn;

    if (isOwner) {
      txn = await licenseDiamondContract
        .connect(signer)
        .editBid(
          newNetworkFee,
          ethers.utils.parseEther(displayNewForSalePrice)
        );
    } else {
      txn = await licenseDiamondContract
        .connect(signer)
        .reclaim(
          ethers.utils.parseEther(displayNewForSalePrice),
          newNetworkFee,
          ethers.utils.parseEther(displayNewForSalePrice)
        );
    }

    await txn.wait();

    return new BN(selectedParcelId.split("x")[1], 16).toString(10);
  }

  return (
    <>
      <ActionForm
        loading={false}
        performAction={_reclaim}
        actionData={actionData}
        setActionData={setActionData}
        summaryView={
          newAnnualNetworkFee ? (
            <TransactionSummaryView
              claimPayment={isOwner ? BigNumber.from("0") : requiredBid}
              newAnnualNetworkFee={newAnnualNetworkFee}
              newNetworkFee={newNetworkFee}
              transactionBundleFeesEstimate={transactionBundleFeesEstimate}
              {...props}
            />
          ) : (
            <></>
          )
        }
        requiredPayment={
          requiredBid && requiredBuffer && !isOwner
            ? requiredBid.add(requiredBuffer)
            : requiredBuffer
        }
        requiredFlowPermissions={1}
        spender={licenseDiamondContract?.address || null}
        flowOperator={licenseDiamondContract?.address || null}
        encodeFunctionData={() => ""}
        bundleCallback={async () => ""}
        setTransactionBundleFeesEstimate={setTransactionBundleFeesEstimate}
        {...props}
      />
      <StreamingInfo {...props} />
    </>
  );
}

export default ReclaimAction;
