import { useState } from "react";
import { useAccount, useContractRead } from "wagmi";
import { formatEther } from "viem";
import Stack from "react-bootstrap/Stack";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Badge from "react-bootstrap/Badge";
import Spinner from "react-bootstrap/Spinner";
import XLogo from "../../assets/x-logo.svg";
import WebIcon from "../../assets/web.svg";
import ExpandMoreIcon from "../../assets/expand-more.svg";
import ExpandLessIcon from "../../assets/expand-less.svg";
import { FundGranteeProps } from "./FundGrantee";
import useFlowingAmount from "../../hooks/flowingAmount";
import useAllo from "../../hooks/allo";
import {
  TimeInterval,
  unitOfTime,
  fromTimeUnitsToSeconds,
  roundWeiAmount,
  clampText,
  formatNumberWithCommas,
} from "../../lib/utils";
import { superfluidPoolAbi } from "../../lib/abi/superfluidPool";

type RecipientDetailsProps = FundGranteeProps & {
  flowRateToReceiver: string;
};

const MAX_DESCRIPTION_LENGTH = 264;

export default function RecipientDetails(props: RecipientDetailsProps) {
  const {
    userAllocationData,
    directAllocationData,
    matchingData,
    granteeIndex,
    name,
    image,
    description,
    website,
    social,
    flowRateToReceiver,
  } = props;

  const [readMore, setReadMore] = useState(false);

  const { address } = useAccount();
  const { recipients, gdaPool } = useAllo();
  const { data: matchingClaimableInfo } = useContractRead({
    address: gdaPool ?? "0x",
    abi: superfluidPoolAbi,
    functionName: "getClaimableNow",
    args: [recipients ? recipients[granteeIndex].recipientAddress : "0x"],
    watch: false,
  });

  const flowRateDirect =
    BigInt(directAllocationData[granteeIndex].flowRate) -
    BigInt(userAllocationData[granteeIndex].flowRate);
  const streamedUntilUpdatedDirect =
    BigInt(directAllocationData[granteeIndex].streamedUntilUpdatedAt) -
    BigInt(userAllocationData[granteeIndex].streamedUntilUpdatedAt);
  const streamedUserAllocation = useFlowingAmount(
    BigInt(userAllocationData[granteeIndex].streamedUntilUpdatedAt),
    userAllocationData[granteeIndex].updatedAtTimestamp,
    BigInt(userAllocationData[granteeIndex].flowRate)
  );
  const streamedDirectAllocation = useFlowingAmount(
    streamedUntilUpdatedDirect,
    directAllocationData[granteeIndex].updatedAtTimestamp,
    flowRateDirect
  );
  const matchingClaimable = matchingClaimableInfo
    ? matchingClaimableInfo[0]
    : BigInt(0);
  const matchingUpdatedAtTimestamp = matchingClaimableInfo
    ? Number(matchingClaimableInfo[1])
    : matchingData.members[granteeIndex].updatedAtTimestamp;
  const streamedMatching = useFlowingAmount(
    matchingClaimable +
      BigInt(matchingData.members[granteeIndex].totalAmountClaimed),
    matchingUpdatedAtTimestamp,
    BigInt(matchingData.members[granteeIndex].flowRate)
  );

  return (
    <Stack direction="vertical" className="bg-blue rounded-4 p-2 pt-0">
      <Stack direction="horizontal" gap={2} className="align-items-end">
        <Image
          src={image}
          alt="SQF"
          width={96}
          height={96}
          className="ms-2 rounded-4"
        />
        <Card className="bg-transparent text-white border-0 mt-3 ms-3">
          <Card.Title className="text-secondary fs-4 d-block text-truncate">
            {name}
          </Card.Title>
          <Card.Subtitle className="mb-0 fs-5">
            Your Current Stream
          </Card.Subtitle>
          <Card.Body className="d-flex align-items-center gap-2 p-0">
            {address && !flowRateToReceiver ? (
              <Spinner
                animation="border"
                role="status"
                className="mx-auto mt-3 p-3"
              ></Spinner>
            ) : (
              <>
                <Card.Text as="span" className="fs-1">
                  {formatNumberWithCommas(
                    parseFloat(
                      roundWeiAmount(
                        BigInt(flowRateToReceiver) *
                          BigInt(
                            fromTimeUnitsToSeconds(
                              1,
                              unitOfTime[TimeInterval.MONTH]
                            )
                          ),
                        4
                      )
                    )
                  )}
                </Card.Text>
                <Card.Text as="span" className="fs-6">
                  DAIx <br />
                  per <br />
                  month
                </Card.Text>
              </>
            )}
          </Card.Body>
        </Card>
      </Stack>
      <Stack direction="horizontal" className="text-secondary fs-4 p-2">
        Details
        <Button
          variant="link"
          href={website}
          target="_blank"
          rel="noreferrer"
          className="ms-2 p-0"
        >
          <Image src={WebIcon} alt="Web" width={18} />
        </Button>
        <Button
          variant="link"
          href={social}
          target="_blank"
          rel="noreferrer"
          className="ms-1 p-0"
        >
          <Image src={XLogo} alt="X Social Network" width={12} />
        </Button>
      </Stack>
      <Stack direction="horizontal" gap={1} className="fs-6 p-2">
        <Stack direction="vertical" gap={1} className="w-25">
          <Card.Text className="m-0 pe-0">You</Card.Text>
          <Badge className="bg-aqua rounded-1 p-1 text-start fs-5 fw-normal">
            {formatNumberWithCommas(
              Number(formatEther(streamedUserAllocation).slice(0, 8))
            )}
          </Badge>
        </Stack>
        <Stack direction="vertical" gap={1} className="w-25">
          <Card.Text className="m-0 pe-0">Direct</Card.Text>
          <Badge className="bg-secondary rounded-1 p-1 text-start fs-5 fw-normal">
            {formatNumberWithCommas(
              parseFloat(formatEther(streamedDirectAllocation).slice(0, 8))
            )}
          </Badge>
        </Stack>
        <Stack direction="vertical" gap={1} className="w-25">
          <Card.Text className="m-0 pe-0">Matching</Card.Text>
          <Badge className="bg-slate rounded-1 p-1 text-start fs-5 fw-normal">
            {formatNumberWithCommas(
              parseFloat(formatEther(streamedMatching).slice(0, 8))
            )}
          </Badge>
        </Stack>
        <Card.Text className="w-20 mt-3">total funding</Card.Text>
      </Stack>
      <Card.Text className="m-0 p-2 fs-5" style={{ maxWidth: 500 }}>
        <>
          {readMore
            ? description
            : clampText(description, MAX_DESCRIPTION_LENGTH)}
        </>
      </Card.Text>
      {readMore ? (
        <Button
          variant="transparent"
          className="p-0 border-0 shadow-none"
          onClick={() => setReadMore(false)}
        >
          <Image src={ExpandLessIcon} alt="less" width={18} />
        </Button>
      ) : description.length > MAX_DESCRIPTION_LENGTH ? (
        <Button
          variant="transparent"
          className="p-0 border-0 shadow-none"
          onClick={() => setReadMore(true)}
        >
          <Image src={ExpandMoreIcon} alt="more" width={18} />
        </Button>
      ) : null}
    </Stack>
  );
}
