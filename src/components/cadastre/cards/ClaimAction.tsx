import * as React from "react";
import { ActionData, ActionForm } from "./ActionForm";
import { BigNumber, ethers } from "ethers";
import BN from "bn.js";
import { OffCanvasPanelProps, ParcelFieldsToUpdate } from "../OffCanvasPanel";
import StreamingInfo from "./StreamingInfo";
import {
  SECONDS_IN_YEAR,
  SSX_HOST,
  REFERRAL_HOST,
} from "../../../lib/constants";
import { fromValueToRate, calculateBufferNeeded } from "../../../lib/utils";
import TransactionSummaryView from "./TransactionSummaryView";
import axios from "axios";
import { DIDSession } from "did-session";
import { SiweMessage } from "@didtools/cacao";
import * as UCAN from "@ipld/dag-ucan";
import { CarReader } from "@ipld/car/reader";

export type ClaimActionProps = OffCanvasPanelProps & {
  signer: ethers.Signer;
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  licenseAddress: string;
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
    signer,
    claimBase1Coord,
    claimBase2Coord,
    registryContract,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    requiredBid,
    setNewParcel,
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

    const txn = await registryContract
      .connect(signer)
      ["claim(int96,uint256,(uint64,uint256,uint256))"](
        newFlowRate,
        ethers.utils.parseEther(displayNewForSalePrice),
        {
          swCoordinate: BigNumber.from(swCoord.toString()),
          lngDim: neX - swX + 1,
          latDim: neY - swY + 1,
        }
      );
    const receipt = await txn.wait();

    await handleReferral(receipt);

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

    return licenseId;
  }

  async function handleReferral(receipt: ethers.providers.TransactionReceipt) {
    const referralStr = localStorage.getItem("referral");
    if (referralStr) {
      const referral = JSON.parse(referralStr);
      if (Date.now() < referral.expiration) {
        const sessionStr = localStorage.getItem("didsession");
        let session;

        if (sessionStr) {
          session = await DIDSession.fromSession(sessionStr);

          const jwt = await session?.did.createJWS({
            txHash: receipt.transactionHash,
            referralId: referral.referralID,
          });

          const delegationResp = await axios.post(
            `${SSX_HOST}/delegations/claim-referral`,
            {
              siwe: SiweMessage.fromCacao(session.cacao),
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
              responseType: "arraybuffer",
            }
          );

          const carReader = await CarReader.fromBytes(
            new Uint8Array(delegationResp.data)
          );
          const block = (await carReader.blocks().next()).value;
          const ucan = UCAN.decode(block.bytes);

          const referrals = JSON.parse(
            localStorage.getItem("referrals") ?? "[]"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any[];
          referrals.push(JSON.stringify(jwt));
          localStorage.setItem("referrals", JSON.stringify(referrals));

          let newReferrals = referrals;

          // Post all referrals to the referral server
          for (const referral of referrals) {
            const resp = await axios.post(
              `${REFERRAL_HOST}/claim`,
              {},
              {
                headers: {
                  jwt: referral,
                  ucan: UCAN.format(ucan),
                },
              }
            );

            // Remove referral from newReferrals on success
            if (resp.status === 201) {
              newReferrals = newReferrals.filter((v) => v !== referral);
              localStorage.setItem("referrals", JSON.stringify(newReferrals));
            }
          }
        }
      }
    }
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
              claimPayment={minForSalePrice}
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
        requiredBuffer={requiredBuffer ? requiredBuffer : BigNumber.from(0)}
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
