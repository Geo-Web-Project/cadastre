import dayjs from "dayjs";
import { ethers, BigNumber } from "ethers";
import * as React from "react";
import { Card, Spinner } from "react-bootstrap";
import { formatBalance } from "../../../lib/formatBalance";
import { truncateEth } from "../../../lib/truncate";
import { ParcelFieldsToUpdate } from "../OffCanvasPanel";
import { ParcelInfoProps } from "./ParcelInfo";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import advancedFormat from "dayjs/plugin/advancedFormat";
import Button from "react-bootstrap/Button";
import { fromValueToRate, calculateBufferNeeded } from "../../../lib/utils";
import { STATE } from "../Map";
import TransactionError from "./TransactionError";
import type { IPCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/IPCOLicenseDiamond";
import { FlowingBalance } from "../profile/FlowingBalance";
import { sfSubgraph } from "../../../redux/store";
import { PAYMENT_TOKEN, NETWORK_ID } from "../../../lib/constants";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);

type OutstandingBidViewProps = ParcelInfoProps & {
  newForSalePrice: BigNumber;
  existingForSalePrice: BigNumber;
  bidTimestamp: BigNumber | null;
  licensorIsOwner: boolean;
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  licenseDiamondContract: IPCOLicenseDiamond | null;
  setParcelFieldsToUpdate: React.Dispatch<
    React.SetStateAction<ParcelFieldsToUpdate | null>
  >;
};

function OutstandingBidView(props: OutstandingBidViewProps) {
  const {
    newForSalePrice,
    existingForSalePrice,
    bidTimestamp,
    licensorIsOwner,
    registryContract,
    licenseDiamondContract,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    setShouldRefetchParcelsData,
    setInteractionState,
    setParcelFieldsToUpdate,
    sfFramework,
    paymentToken,
    signer,
  } = props;

  const [isActing, setIsActing] = React.useState(false);
  const [didFail, setDidFail] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [shouldBidPeriodEndEarly, setShouldBidPeriodEndEarly] = React.useState<
    boolean | null
  >(null);
  const [actionDate, setActionDate] = React.useState<Date | null>(null);

  const { isLoading, data } = sfSubgraph.useAccountTokenSnapshotsQuery({
    chainId: NETWORK_ID,
    filter: {
      account: licenseDiamondContract ? licenseDiamondContract.address : "",
      token: paymentToken.address,
    },
  });

  const newForSalePriceDisplay = truncateEth(
    formatBalance(newForSalePrice),
    18
  );

  const existingNetworkFee = fromValueToRate(
    existingForSalePrice,
    perSecondFeeNumerator,
    perSecondFeeDenominator
  );

  const existingForSalePriceDisplay = truncateEth(
    formatBalance(existingForSalePrice),
    18
  );

  const [bidPeriodLength, setBidPeriodLength] =
    React.useState<BigNumber | null>(null);

  const spinner = (
    <Spinner as="span" size="sm" animation="border" role="status">
      <span className="visually-hidden">Loading...</span>
    </Spinner>
  );

  React.useEffect(() => {
    async function checkBidPeriod() {
      if (!registryContract || !licenseDiamondContract) return;

      setBidPeriodLength(await registryContract.getBidPeriodLengthInSeconds());

      const _shouldBidPeriodEndEarly =
        await licenseDiamondContract.shouldBidPeriodEndEarly();
      setShouldBidPeriodEndEarly(_shouldBidPeriodEndEarly);

      if (_shouldBidPeriodEndEarly) {
        const accountInfo = await sfFramework.cfaV1.getAccountFlowInfo({
          superToken: paymentToken.address,
          account: licenseDiamondContract.address,
          providerOrSigner: sfFramework.settings.provider,
        });
        setActionDate(accountInfo.timestamp);
      } else {
        setActionDate(null);
      }
    }

    checkBidPeriod();
  }, [registryContract, licenseDiamondContract]);

  const bidDeadline =
    bidTimestamp && bidPeriodLength ? bidTimestamp.add(bidPeriodLength) : null;
  const formattedBidDeadline = bidDeadline
    ? dayjs.unix(bidDeadline.toNumber()).format("YYYY-MM-DD HH:mm z")
    : null;

  const isPastDeadline =
    bidDeadline && new Date(Number(bidDeadline) * 1000) <= new Date();

  const formattedActionDate = actionDate
    ? dayjs(actionDate).format("YYYY-MM-DD HH:mm z")
    : null;

  const shouldAllowTrigger = shouldBidPeriodEndEarly || isPastDeadline;

  async function acceptBid() {
    setIsActing(true);
    setDidFail(false);

    if (!licenseDiamondContract) {
      throw new Error("Could not find licenseDiamondContract");
    }

    if (!newForSalePrice) {
      throw new Error("Could not find newForSalePrice");
    }

    if (!existingNetworkFee) {
      throw new Error("Could not find existingNetworkFee");
    }

    if (!signer) {
      throw new Error("Could not find signer");
    }

    try {
      const txn = await licenseDiamondContract.connect(signer).acceptBid();
      await txn.wait();
    } catch (err) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      if (
        (err as any)?.code !== "TRANSACTION_REPLACED" ||
        (err as any).cancelled
      ) {
        console.error(err);
        setErrorMessage(
          (err as any).reason
            ? (err as any).reason.replace("execution reverted: ", "")
            : (err as Error).message
        );
        setDidFail(true);
        setIsActing(false);
        return;
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }

    setIsActing(false);
    setShouldRefetchParcelsData(true);
    setParcelFieldsToUpdate({
      forSalePrice: newForSalePriceDisplay !== existingForSalePriceDisplay,
      licenseOwner: true,
    });
    setInteractionState(STATE.PARCEL_SELECTED);
  }

  async function triggerTransfer() {
    setIsActing(true);
    setDidFail(false);

    if (!licenseDiamondContract) {
      throw new Error("Could not find licenseDiamondContract");
    }

    if (!signer) {
      throw new Error("Could not find signer");
    }

    try {
      const txn = await licenseDiamondContract
        .connect(signer)
        .triggerTransfer();

      await txn.wait();
    } catch (err) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      if ((err as any).reason) {
        setErrorMessage(
          (err as any).errorObject.reason.replace("execution reverted: ", "")
        );
      } else {
        setErrorMessage((err as any).message);
        /* eslint-disable @typescript-eslint/no-explicit-any */
      }
      setDidFail(true);
      setIsActing(false);
      console.error(err);
      return;
    }

    setShouldRefetchParcelsData(true);
    setParcelFieldsToUpdate({
      forSalePrice: false,
      licenseOwner: true,
    });
    setIsActing(false);
    setInteractionState(STATE.PARCEL_SELECTED);
  }

  // Calculate payout if surplus or depleted balance
  const newNetworkFee = fromValueToRate(
    newForSalePrice,
    perSecondFeeNumerator,
    perSecondFeeDenominator
  );

  const [existingBuffer, setExistingBuffer] = React.useState<BigNumber | null>(
    null
  );

  React.useEffect(() => {
    const run = async () => {
      if (!existingNetworkFee) {
        setExistingBuffer(null);
        return;
      }

      const _bufferNeeded = await calculateBufferNeeded(
        sfFramework,
        paymentToken,
        existingNetworkFee
      );
      setExistingBuffer(_bufferNeeded);
    };

    run();
  }, [sfFramework, paymentToken, existingForSalePrice]);

  const [newBuffer, setNewBuffer] = React.useState<BigNumber | null>(null);

  React.useEffect(() => {
    const run = async () => {
      if (!newNetworkFee) {
        setNewBuffer(null);
        return;
      }

      const _bufferNeeded = await calculateBufferNeeded(
        sfFramework,
        paymentToken,
        newNetworkFee
      );
      setNewBuffer(_bufferNeeded);
    };

    run();
  }, [sfFramework, paymentToken, newForSalePrice]);

  const calculatePayerPayout = (availableBalance: BigNumber) => {
    if (!newBuffer || !existingBuffer) {
      return BigNumber.from(0);
    }

    const payout = availableBalance
      .sub(newForSalePrice.sub(existingForSalePrice))
      .sub(newBuffer.sub(existingBuffer));
    return payout.gt(0) ? payout : BigNumber.from(0);
  };

  const calculateBidderPayout = (availableBalance: BigNumber) => {
    if (
      existingBuffer &&
      availableBalance.lt(existingForSalePrice.add(existingBuffer))
    ) {
      return newForSalePrice
        .sub(existingForSalePrice)
        .sub(existingForSalePrice.add(existingBuffer));
    } else {
      return newForSalePrice.sub(existingForSalePrice);
    }
  };

  return (
    <Card
      text="white"
      className="bg-secondary bg-opacity-25 mt-4 mt-sm-5 mt-lg-0"
    >
      <Card.Header>
        <h3>Outstanding Bid</h3>
      </Card.Header>
      <Card.Body>
        {shouldBidPeriodEndEarly ? (
          <>
            <p className="text-danger">
              The network fee stream for this parcel was modified while there
              was an outstanding bid, so the bid response window is closed. The
              previous licensor will receive their original For Sale Price net
              their network fee payment shortfall or surplus upon transfer.
            </p>
            <p>
              For Sale Price (Bid): {newForSalePriceDisplay} {PAYMENT_TOKEN}
            </p>
            <p>
              Bidder Collateral:{" "}
              {data && !isLoading ? (
                <FlowingBalance
                  format={(availableBalance) =>
                    truncateEth(
                      ethers.utils.formatUnits(
                        calculateBidderPayout(BigNumber.from(availableBalance))
                      ),
                      8
                    ) +
                    " " +
                    PAYMENT_TOKEN
                  }
                  accountTokenSnapshot={data.items[0]}
                />
              ) : (
                spinner
              )}
            </p>
            <p>
              {licensorIsOwner
                ? "Payment You'd Receive: "
                : "Payment to Licensor: "}{" "}
              {data && !isLoading ? (
                <FlowingBalance
                  format={(availableBalance) =>
                    truncateEth(
                      ethers.utils.formatUnits(
                        calculatePayerPayout(
                          BigNumber.from(availableBalance)
                        ) ?? BigNumber.from(0)
                      ),
                      8
                    ) +
                    " " +
                    PAYMENT_TOKEN
                  }
                  accountTokenSnapshot={data.items[0]}
                />
              ) : (
                spinner
              )}
            </p>
            <p>
              Action Date: {formattedActionDate ? formattedActionDate : spinner}
            </p>
          </>
        ) : (
          <>
            <p>
              For Sale Price (Bid): {newForSalePriceDisplay} {PAYMENT_TOKEN}
            </p>
            <p>
              {licensorIsOwner
                ? "Payment You'd Receive: "
                : "Payment to Licensor: "}{" "}
              {existingForSalePriceDisplay} {PAYMENT_TOKEN}
            </p>
            <p>
              Response Deadline:{" "}
              {formattedBidDeadline ? formattedBidDeadline : spinner}
            </p>
          </>
        )}
        {licensorIsOwner && !shouldAllowTrigger ? (
          <>
            <Button
              variant="success"
              className="w-100 mb-2"
              disabled={isActing}
              onClick={() => acceptBid()}
            >
              {isActing ? spinner : "Accept Bid"}
            </Button>
            <Button
              variant="danger"
              className="w-100 mb-2"
              disabled={isActing}
              onClick={() => setInteractionState(STATE.PARCEL_REJECTING_BID)}
            >
              Reject Bid
            </Button>
          </>
        ) : null}
        {shouldAllowTrigger && signer ? (
          <Button
            variant="primary"
            className="w-100 mb-2"
            disabled={isActing}
            onClick={() => triggerTransfer()}
          >
            {isActing ? spinner : "Trigger Transfer"}
          </Button>
        ) : null}
        {didFail && !isActing ? (
          <TransactionError
            message={errorMessage}
            onClick={() => setDidFail(false)}
          />
        ) : null}
      </Card.Body>
    </Card>
  );
}

export default OutstandingBidView;
