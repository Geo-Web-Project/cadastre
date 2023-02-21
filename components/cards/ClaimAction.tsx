import * as React from "react";
import { ActionData, ActionForm } from "./ActionForm";
import { BigNumber, ethers } from "ethers";
import BN from "bn.js";
import { SidebarProps, ParcelFieldsToUpdate } from "../Sidebar";
import StreamingInfo from "./StreamingInfo";
import { SECONDS_IN_YEAR } from "../../lib/constants";
import { fromValueToRate, calculateBufferNeeded } from "../../lib/utils";
import TransactionSummaryView from "./TransactionSummaryView";

export type ClaimActionProps = SidebarProps & {
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  licenseAddress: string;
  /** during the fair launch period (true) or after (false). */
  isFairLaunch?: boolean;
  requiredBid: BigNumber;
  setParcelFieldsToUpdate: React.Dispatch<
    React.SetStateAction<ParcelFieldsToUpdate | null>
  >;
  minForSalePrice: BigNumber;
};

function ClaimAction(props: ClaimActionProps) {
  const {
    geoWebCoordinate,
    account,
    claimBase1Coord,
    claimBase2Coord,
    registryContract,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    isFairLaunch,
    requiredBid,
    setNewParcel,
    setParcelFieldsToUpdate,
    provider,
    sfFramework,
    paymentToken,
    minForSalePrice,
  } = props;
  const [actionData, setActionData] = React.useState<ActionData>({
    isActing: false,
    didFail: false,
    displayNewForSalePrice: "",
  });
  const [flowOperator, setFlowOperator] = React.useState<string>("");

  const { displayNewForSalePrice } = actionData;

  const isForSalePriceInvalid: boolean =
    displayNewForSalePrice != null &&
    displayNewForSalePrice.length > 0 &&
    isNaN(Number(displayNewForSalePrice));

  const newFlowRate =
    !isForSalePriceInvalid && displayNewForSalePrice
      ? fromValueToRate(
          ethers.utils.parseEther(displayNewForSalePrice),
          perSecondFeeNumerator,
          perSecondFeeDenominator
        )
      : null;

  const networkFeeRatePerYear =
    !isForSalePriceInvalid && displayNewForSalePrice
      ? fromValueToRate(
          ethers.utils.parseEther(displayNewForSalePrice),
          perSecondFeeNumerator.mul(SECONDS_IN_YEAR),
          perSecondFeeDenominator
        )
      : null;

  const [requiredBuffer, setRequiredBuffer] = React.useState<BigNumber | null>(
    null
  );

  React.useEffect(() => {
    const run = async () => {
      if (!newFlowRate) {
        setRequiredBuffer(null);
        return;
      }

      const _bufferNeeded = await calculateBufferNeeded(
        sfFramework,
        paymentToken,
        newFlowRate
      );
      setRequiredBuffer(_bufferNeeded);
    };

    run();
  }, [sfFramework, paymentToken, displayNewForSalePrice]);

  async function _claim() {
    if (!claimBase1Coord || !claimBase2Coord) {
      throw new Error(`Unknown coordinates`);
    }

    const swX = Math.min(claimBase1Coord.x, claimBase2Coord.x);
    const swY = Math.min(claimBase1Coord.y, claimBase2Coord.y);
    const neX = Math.max(claimBase1Coord.x, claimBase2Coord.x);
    const neY = Math.max(claimBase1Coord.y, claimBase2Coord.y);
    const swCoord = geoWebCoordinate.make_gw_coord(swX, swY);

    if (!displayNewForSalePrice || !newFlowRate || isForSalePriceInvalid) {
      throw new Error(
        `displayNewForSalePrice is invalid: ${displayNewForSalePrice}`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signer = provider.getSigner() as any;

    const txn = await registryContract
      .connect(signer)
      .claim(newFlowRate, ethers.utils.parseEther(displayNewForSalePrice), {
        swCoordinate: BigNumber.from(swCoord.toString()),
        lngDim: neX - swX + 1,
        latDim: neY - swY + 1,
      });
    const receipt = await txn.wait();

    const filter = registryContract.filters.ParcelClaimedV2(null, null);

    const res = await registryContract.queryFilter(
      filter,
      receipt.blockNumber,
      receipt.blockNumber
    );
    const licenseId = res[0].args[0].toString();
    setNewParcel((prev) => {
      return { ...prev, id: `0x${new BN(licenseId.toString()).toString(16)}` };
    });

    setParcelFieldsToUpdate({ forSalePrice: true, licenseOwner: true });

    return licenseId;
  }

  React.useEffect(() => {
    const _fetchFlowOperator = async () => {
      const _flowOperator = await registryContract.getNextProxyAddress(account);
      setFlowOperator(_flowOperator);
    };

    _fetchFlowOperator();
  }, [registryContract, account]);

  return (
    <>
      <ActionForm
        loading={false}
        performAction={_claim}
        actionData={actionData}
        setActionData={setActionData}
        summaryView={
          networkFeeRatePerYear ? (
            <TransactionSummaryView
              claimPayment={isFairLaunch ? requiredBid : minForSalePrice}
              newAnnualNetworkFee={networkFeeRatePerYear}
              newNetworkFee={newFlowRate}
              {...props}
            />
          ) : (
            <></>
          )
        }
        requiredPayment={
          requiredBid && requiredBuffer ? requiredBid.add(requiredBuffer) : null
        }
        requiredFlowPermissions={1}
        spender={registryContract.address}
        flowOperator={flowOperator}
        {...props}
      />
      <StreamingInfo {...props} />
    </>
  );
}

export default ClaimAction;
