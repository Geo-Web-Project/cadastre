import * as React from "react";
import { BigNumber, ethers } from "ethers";
import { formatBalance } from "../../lib/formatBalance";
import { ParcelFieldsToUpdate } from "../Sidebar";
import TransactionSummaryView from "./TransactionSummaryView";
import { fromValueToRate, calculateBufferNeeded } from "../../lib/utils";
import { PAYMENT_TOKEN, SECONDS_IN_YEAR } from "../../lib/constants";
import StreamingInfo from "./StreamingInfo";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Alert from "react-bootstrap/Alert";
import { truncateEth } from "../../lib/truncate";
import { useSuperTokenBalance } from "../../lib/superTokenBalance";
import Image from "react-bootstrap/Image";
import { STATE } from "../Map";
import InfoTooltip from "../InfoTooltip";
import TransactionError from "./TransactionError";
import type { IPCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/IPCOLicenseDiamond";
import { PerformButton } from "../PerformButton";
import AddFundsButton from "../profile/AddFundsButton";
import { GeoWebParcel, ParcelInfoProps } from "./ParcelInfo";

export type PlaceBidActionProps = ParcelInfoProps & {
  signer: ethers.Signer;
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  parcelData: GeoWebParcel;
  licenseDiamondContract: IPCOLicenseDiamond | null;
  setParcelFieldsToUpdate: React.Dispatch<
    React.SetStateAction<ParcelFieldsToUpdate | null>
  >;
};

const infoIcon = (
  <Image
    style={{
      width: "1.1rem",
      marginLeft: "4px",
    }}
    src="info.svg"
  />
);

function PlaceBidAction(props: PlaceBidActionProps) {
  const {
    account,
    smartAccount,
    parcelData,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    licenseDiamondContract,
    setInteractionState,
    setShouldRefetchParcelsData,
    setParcelFieldsToUpdate,
    sfFramework,
    paymentToken,
  } = props;

  const [didFail, setDidFail] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [isActing, setIsActing] = React.useState(false);
  const [displayNewForSalePrice, setDisplayNewForSalePrice] = React.useState<
    string | null
  >(null);
  const [isBalanceInsufficient, setIsBalanceInsufficient] =
    React.useState(false);
  const [ethBalanceSubGasBuffer, setEthBalanceSubGasBuffer] =
    React.useState<BigNumber>(BigNumber.from(0));

  const { superTokenBalance } = useSuperTokenBalance(
    account,
    paymentToken.address
  );

  const displayCurrentForSalePrice = formatBalance(
    parcelData.currentBid.forSalePrice
  );
  const currentForSalePrice = ethers.utils.parseEther(
    displayCurrentForSalePrice
  );

  const newForSalePrice =
    displayNewForSalePrice != null &&
    displayNewForSalePrice.length > 0 &&
    !isNaN(Number(displayNewForSalePrice))
      ? ethers.utils.parseEther(displayNewForSalePrice)
      : null;

  const isForSalePriceInvalid: boolean =
    displayNewForSalePrice != null &&
    displayNewForSalePrice.length > 0 &&
    (isNaN(Number(displayNewForSalePrice)) ||
      ethers.utils.parseEther(displayNewForSalePrice).lt(currentForSalePrice));

  const existingAnnualNetworkFee = fromValueToRate(
    currentForSalePrice,
    perSecondFeeNumerator.mul(SECONDS_IN_YEAR),
    perSecondFeeDenominator
  );

  const newNetworkFee =
    !isForSalePriceInvalid &&
    newForSalePrice &&
    perSecondFeeNumerator &&
    perSecondFeeDenominator
      ? fromValueToRate(
          newForSalePrice,
          perSecondFeeNumerator,
          perSecondFeeDenominator
        )
      : null;

  const annualFeePercentage =
    (perSecondFeeNumerator.toNumber() * SECONDS_IN_YEAR * 100) /
    perSecondFeeDenominator.toNumber();

  const annualNetworkFeeRate = newForSalePrice
    ?.mul(annualFeePercentage)
    .div(100);

  const isInvalid = isForSalePriceInvalid || !displayNewForSalePrice;

  const [requiredBuffer, setRequiredBuffer] = React.useState<BigNumber | null>(
    null
  );

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
    (async () => {
      const ethBalance = await smartAccount?.safe?.getBalance();
      const gasBuffer = ethers.utils.parseEther("0.002");

      setEthBalanceSubGasBuffer(
        ethBalance ? ethBalance.sub(gasBuffer) : BigNumber.from(0)
      );

      const requiredPayment =
        newForSalePrice && requiredBuffer
          ? newForSalePrice.add(requiredBuffer)
          : null;

      // TODO: is the correct way to check for insufficient balance?
      setIsBalanceInsufficient(
        requiredPayment
          ? requiredPayment.gt(
              ethBalance ? superTokenBalance.add(ethBalance) : superTokenBalance
            )
          : false
      );
    })();
  }, [superTokenBalance]);

  function placeBid() {
    setIsActing(true);
    setDidFail(false);

    if (!licenseDiamondContract) {
      throw new Error("Could not find licenseDiamondContract");
    }

    if (!newForSalePrice) {
      throw new Error("Could not find newForSalePrice");
    }

    if (!newNetworkFee) {
      throw new Error("Could not find newNetworkFee");
    }

    if (!smartAccount?.safeAddress) {
      throw new Error("Safe is uninitialized");
    }

    const placeBidTxData = licenseDiamondContract.interface.encodeFunctionData(
      "placeBid",
      [newNetworkFee, newForSalePrice]
    );

    return placeBidTxData;
  }

  const callback = async () => {
    setIsActing(false);
    setShouldRefetchParcelsData(true);
    setInteractionState(STATE.PARCEL_SELECTED);
    setParcelFieldsToUpdate({
      forSalePrice: displayNewForSalePrice !== displayCurrentForSalePrice,
      licenseOwner: false,
    });
  };

  return (
    <>
      <Card border="secondary" className="bg-dark mt-5">
        <Card.Header>
          <h3>Place Bid</h3>
        </Card.Header>
        <Card.Body>
          <Form>
            <Form.Group>
              <Form.Text className="text-primary mb-1">
                New For Sale Price ({PAYMENT_TOKEN}, Fully Collateralized)
                <InfoTooltip
                  content={
                    <div style={{ textAlign: "left" }}>
                      The current licensor will have 7 days to respond to your
                      bid. They must pay a 10% penalty if they reject your bid.
                      If they do not act during this window, you must submit
                      another transaction to take effective control of the
                      parcel.
                      <br />
                      <br />
                      <a
                        href="https://docs.geoweb.network/concepts/partial-common-ownership"
                        target="_blank"
                        rel="noopener"
                      >
                        You can read more about Partial Common Ownership in our
                        docs.
                      </a>
                    </div>
                  }
                  target={infoIcon}
                />
              </Form.Text>
              <Form.Control
                required
                isInvalid={isForSalePriceInvalid}
                className="bg-dark text-light mt-1"
                type="text"
                placeholder={`New For Sale Price (${PAYMENT_TOKEN})`}
                aria-label="For Sale Price"
                aria-describedby="for-sale-price"
                disabled={isActing}
                onChange={(e) => setDisplayNewForSalePrice(e.target.value)}
              />
              {isForSalePriceInvalid ? (
                <Form.Control.Feedback type="invalid">
                  Must be equal or exceed the current For Sale Price
                </Form.Control.Feedback>
              ) : null}

              <br />
              <Form.Text className="text-primary mb-1">
                {annualFeePercentage}% Network Fee ({PAYMENT_TOKEN}, Streamed)
                <InfoTooltip
                  content={
                    <div style={{ textAlign: "left" }}>
                      Network fees are proportional to your For Sale Price. They
                      discourage squatting & create a healthier market. They are
                      used to fund public goods—promoting positive-sum outcomes.
                      You have a say in how they're spent!
                      <br />
                      <br />
                      You pay these fees by opening a per-second stream. Your
                      total yearly payment will be slightly lower than the
                      displayed value due to rounding.
                    </div>
                  }
                  target={infoIcon}
                />
              </Form.Text>
              <Form.Control
                className="bg-dark text-info mt-1"
                type="text"
                readOnly
                disabled
                value={`${
                  annualNetworkFeeRate
                    ? truncateEth(formatBalance(annualNetworkFeeRate), 10)
                    : "0"
                } ${PAYMENT_TOKEN}/year`}
                aria-label="Network Fee"
                aria-describedby="network-fee"
              />
            </Form.Group>
            <br />
            <hr className="action-form_divider" />
            <br />
            {!isForSalePriceInvalid && existingAnnualNetworkFee ? (
              <TransactionSummaryView
                existingAnnualNetworkFee={existingAnnualNetworkFee}
                newAnnualNetworkFee={annualNetworkFeeRate ?? null}
                newNetworkFee={newNetworkFee}
                currentForSalePrice={currentForSalePrice}
                collateralDeposit={newForSalePrice ?? undefined}
                {...props}
              />
            ) : null}

            <br />
            <AddFundsButton {...props} />
            <PerformButton
              {...props}
              ethBalanceSubGasBuffer={ethBalanceSubGasBuffer ?? null}
              requiredFlowAmount={annualNetworkFeeRate ?? null}
              requiredPayment={
                newForSalePrice && requiredBuffer
                  ? newForSalePrice.add(requiredBuffer)
                  : null
              }
              spender={licenseDiamondContract?.address ?? null}
              requiredFlowPermissions={1}
              flowOperator={licenseDiamondContract?.address ?? null}
              setErrorMessage={setErrorMessage}
              setIsActing={setIsActing}
              setDidFail={setDidFail}
              isDisabled={isActing || isInvalid || isBalanceInsufficient}
              isActing={isActing}
              buttonText={"Place Bid"}
              encodeFunctionData={placeBid}
              callback={callback}
            />
          </Form>

          <br />
          {isBalanceInsufficient && displayNewForSalePrice ? (
            <Alert key="warning" variant="warning">
              <Alert.Heading>Insufficient Funds</Alert.Heading>
              Click Add Funds above and send ETH to your account to complete
              your transaction.
            </Alert>
          ) : didFail && !isActing ? (
            <TransactionError
              message={errorMessage}
              onClick={() => setDidFail(false)}
            />
          ) : null}
        </Card.Body>
      </Card>
      <StreamingInfo {...props} />
    </>
  );
}

export default PlaceBidAction;
