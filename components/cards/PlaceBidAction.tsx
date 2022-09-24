import * as React from "react";
import { BigNumber, ethers } from "ethers";
import { formatBalance } from "../../lib/formatBalance";
import { SidebarProps } from "../Sidebar";
import TransactionSummaryView from "./TransactionSummaryView";
import { fromValueToRate, calculateBufferNeeded } from "../../lib/utils";
import { PAYMENT_TOKEN, SECONDS_IN_YEAR } from "../../lib/constants";
import StreamingInfo from "./StreamingInfo";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import { truncateEth } from "../../lib/truncate";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import WrapModal from "../wrap/WrapModal";
import { STATE } from "../Map";
import InfoTooltip from "../InfoTooltip";
import TransactionError from "./TransactionError";
import type { PCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/PCOLicenseDiamond";
import { ApproveOrPerformButton } from "../ApproveOrPerformButton";
import { GeoWebParcel } from "./ParcelInfo";

export type PlaceBidActionProps = SidebarProps & {
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  parcelData: GeoWebParcel;
  licenseDiamondContract: PCOLicenseDiamond | null;
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
    parcelData,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    licenseDiamondContract,
    setInteractionState,
    setIsPortfolioToUpdate,
    sfFramework,
    paymentToken,
    provider,
  } = props;

  const [showWrapModal, setShowWrapModal] = React.useState(false);
  const [didFail, setDidFail] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [isActing, setIsActing] = React.useState(false);
  const [displayNewForSalePrice, setDisplayNewForSalePrice] =
    React.useState<string | null>(null);

  const handleWrapModalOpen = () => setShowWrapModal(true);
  const handleWrapModalClose = () => setShowWrapModal(false);

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
        provider,
        paymentToken,
        newNetworkFee
      );
      setRequiredBuffer(_bufferNeeded);
    };

    run();
  }, [sfFramework, paymentToken, provider, displayNewForSalePrice]);

  async function placeBid() {
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

    try {
      const txn = await licenseDiamondContract.placeBid(
        newNetworkFee,
        newForSalePrice
      );
      await txn.wait();
    } catch (err) {
      console.error(err);
      setErrorMessage(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any).reason
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (err as any).reason.replace("execution reverted: ", "")
          : (err as Error).message
      );
      setDidFail(true);
      setIsActing(false);
      return;
    }

    setIsActing(false);
    setIsPortfolioToUpdate(true);
    setInteractionState(STATE.PARCEL_SELECTED);
  }

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
                currentForSalePrice={currentForSalePrice}
                collateralDeposit={newForSalePrice ?? undefined}
                {...props}
              />
            ) : null}

            <br />
            <Button
              variant="secondary"
              className="w-100 mb-3"
              onClick={handleWrapModalOpen}
            >
              {`Wrap to ${PAYMENT_TOKEN}`}
            </Button>
            <ApproveOrPerformButton
              {...props}
              isDisabled={isActing || isInvalid}
              buttonText={"Place Bid"}
              requiredFlowAmount={annualNetworkFeeRate ?? null}
              requiredPayment={
                newForSalePrice && requiredBuffer
                  ? newForSalePrice.add(requiredBuffer)
                  : null
              }
              performAction={placeBid}
              spender={licenseDiamondContract?.address ?? null}
              requiredFlowPermissions={1}
              flowOperator={licenseDiamondContract?.address ?? null}
              setErrorMessage={setErrorMessage}
              setIsActing={setIsActing}
              setDidFail={setDidFail}
            />
          </Form>

          <br />
          {didFail && !isActing ? (
            <TransactionError
              message={errorMessage}
              onClick={() => setDidFail(false)}
            />
          ) : null}
        </Card.Body>
        <Card.Footer className="border-top border-secondary">
          <Row>
            <Col sm="1">
              <Image src="notice.svg" />
            </Col>
            <Col className="fst-italic">
              Claims, transfers, changes to For Sale Prices, and network fee
              payments require confirmation in your Web3 wallet.
            </Col>
          </Row>
        </Card.Footer>
      </Card>

      {showWrapModal && (
        <WrapModal
          show={showWrapModal}
          handleClose={handleWrapModalClose}
          {...props}
        />
      )}
      <StreamingInfo {...props} />
    </>
  );
}

export default PlaceBidAction;
