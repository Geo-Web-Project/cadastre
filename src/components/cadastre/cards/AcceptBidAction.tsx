import * as React from "react";
import { BigNumber } from "ethers";
import { formatBalance } from "../../../lib/formatBalance";
import { ParcelFieldsToUpdate } from "../OffCanvasPanel";
import TransactionSummaryView from "./TransactionSummaryView";
import { fromValueToRate } from "../../../lib/utils";
import { PAYMENT_TOKEN, SECONDS_IN_YEAR } from "../../../lib/constants";
import StreamingInfo from "./StreamingInfo";
import Card from "react-bootstrap/Card";
import Spinner from "react-bootstrap/Spinner";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import advancedFormat from "dayjs/plugin/advancedFormat";
import AuctionInstructions from "../AuctionInstructions";
import { ParcelInfoProps } from "./ParcelInfo";
import { useMediaQuery } from "../../../hooks/mediaQuery";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);

export type AcceptBidActionProps = ParcelInfoProps & {
  newForSalePrice: BigNumber;
  existingForSalePrice: BigNumber;
  bidTimestamp: BigNumber | null;
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  setParcelFieldsToUpdate: React.Dispatch<
    React.SetStateAction<ParcelFieldsToUpdate | null>
  >;
};

function AcceptBidAction(props: AcceptBidActionProps) {
  const {
    newForSalePrice,
    existingForSalePrice,
    bidTimestamp,
    registryContract,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    signer,
  } = props;
  const { isMobile, isTablet } = useMediaQuery();

  const [bidPeriodLength, setBidPeriodLength] =
    React.useState<BigNumber | null>(null);

  const newForSalePriceDisplay = formatBalance(newForSalePrice);
  const existingNetworkFee = fromValueToRate(
    existingForSalePrice,
    perSecondFeeNumerator,
    perSecondFeeDenominator
  );

  const existingAnnualNetworkFee = fromValueToRate(
    existingForSalePrice,
    perSecondFeeNumerator.mul(SECONDS_IN_YEAR),
    perSecondFeeDenominator
  );

  const newNetworkFee =
    newForSalePrice && perSecondFeeNumerator && perSecondFeeDenominator
      ? fromValueToRate(
          newForSalePrice,
          perSecondFeeNumerator,
          perSecondFeeDenominator
        )
      : null;

  const spinner = (
    <Spinner as="span" size="sm" animation="border" role="status">
      <span className="visually-hidden">Sending Transaction...</span>
    </Spinner>
  );

  React.useEffect(() => {
    async function checkBidPeriod() {
      if (!registryContract) return;

      setBidPeriodLength(await registryContract.getBidPeriodLengthInSeconds());
    }

    checkBidPeriod();
  }, [registryContract]);

  const bidDeadline =
    bidTimestamp && bidPeriodLength ? bidTimestamp.add(bidPeriodLength) : null;
  const formattedBidDeadline = bidDeadline
    ? dayjs.unix(bidDeadline.toNumber()).format("YYYY-MM-DD HH:mm z")
    : null;

  return (
    <>
      <Card
        border={isMobile || isTablet ? "dark" : "secondary"}
        className="bg-dark"
        text="white"
      >
        <Card.Header className="d-none d-lg-block">
          <h3>Accept Bid</h3>
        </Card.Header>
        <Card.Body className="p-1 p-lg-3">
          <p>
            For Sale Price (Bid): {newForSalePriceDisplay} {PAYMENT_TOKEN}
          </p>
          <p>
            Response Deadline:{" "}
            {formattedBidDeadline ? formattedBidDeadline : spinner}
          </p>
          <AuctionInstructions />
          <br className="d-lg-none" />
          <div className="d-none d-lg-block">
            <hr className="action-form_divider" />
          </div>
          {existingAnnualNetworkFee ? (
            <TransactionSummaryView
              existingAnnualNetworkFee={existingAnnualNetworkFee}
              newAnnualNetworkFee={BigNumber.from(0)}
              existingNetworkFee={existingNetworkFee}
              newNetworkFee={newNetworkFee}
              currentForSalePrice={existingForSalePrice}
              {...props}
            />
          ) : null}

          <br />
          <br />
          <br />
        </Card.Body>
      </Card>
      {signer && <StreamingInfo {...props} signer={signer} />}
    </>
  );
}

export default AcceptBidAction;
