import * as React from "react";
import { BigNumber, ethers } from "ethers";
import BN from "bn.js";
import type { IPCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/IPCOLicenseDiamond";
import { ActionData, ActionForm } from "./ActionForm";
import { ParcelFieldsToUpdate } from "../OffCanvasPanel";
import { ParcelInfoProps } from "./ParcelInfo";
import StreamingInfo from "./StreamingInfo";
import TransactionSummaryView from "./TransactionSummaryView";
import { BasicProfile } from "../../lib/geo-web-content/basicProfile";
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
  basicProfile: BasicProfile | null;
};

function ReclaimAction(props: ReclaimActionProps) {
  const {
    account,
    signer,
    smartAccount,
    licenseOwner,
    requiredBid,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    licenseDiamondContract,
    selectedParcelId,
    sfFramework,
    paymentToken,
    basicProfile,
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

  const accountAddress = smartAccount?.safe ? smartAccount.address : account;
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
  const isOwner = accountAddress === licenseOwner;

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
    if (basicProfile && isOwner) {
      updateActionData({
        parcelName: basicProfile.name,
        parcelWebContentURI: basicProfile.external_url,
      });
    }
  }, [basicProfile]);

  function updateActionData(updatedValues: ActionData) {
    function _updateData(updatedValues: ActionData) {
      return (prevState: ActionData) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setActionData(_updateData(updatedValues));
  }

  async function getReclaimMetaTransaction() {
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

    let encodedReclaimData;

    if (isOwner) {
      encodedReclaimData = licenseDiamondContract.interface.encodeFunctionData(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        "editBid(int96,uint256)",
        [newNetworkFee, ethers.utils.parseEther(displayNewForSalePrice)]
      );
    } else {
      encodedReclaimData = licenseDiamondContract.interface.encodeFunctionData(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        "reclaim(uint256,int96,uint256)",
        [
          ethers.utils.parseEther(displayNewForSalePrice),
          newNetworkFee,
          ethers.utils.parseEther(displayNewForSalePrice),
        ]
      );
    }

    return {
      to: licenseDiamondContract.address,
      data: encodedReclaimData,
      value: "0",
    };
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
        ["editBid(int96,uint256)"](
          newNetworkFee,
          ethers.utils.parseEther(displayNewForSalePrice)
        );
    } else {
      txn = await licenseDiamondContract
        .connect(signer)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .reclaim(
          ethers.utils.parseEther(displayNewForSalePrice),
          newNetworkFee,
          ethers.utils.parseEther(displayNewForSalePrice)
        );
    }

    await txn.wait();

    return new BN(selectedParcelId.split("x")[1], 16).toString(10);
  }

  async function bundleCallback() {
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
        requiredBuffer={requiredBuffer ? requiredBuffer : BigNumber.from(0)}
        spender={licenseDiamondContract?.address || null}
        flowOperator={licenseDiamondContract?.address || null}
        metaTransactionCallbacks={[getReclaimMetaTransaction]}
        bundleCallback={bundleCallback}
        transactionBundleFeesEstimate={transactionBundleFeesEstimate}
        setTransactionBundleFeesEstimate={setTransactionBundleFeesEstimate}
        {...props}
      />
      <StreamingInfo {...props} />
    </>
  );
}

export default ReclaimAction;
