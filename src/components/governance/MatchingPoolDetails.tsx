import { useMemo } from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import Stack from "react-bootstrap/Stack";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Badge from "react-bootstrap/Badge";
import Spinner from "react-bootstrap/Spinner";
import XLogo from "../../assets/x-logo.svg";
import WebIcon from "../../assets/web.svg";
import SQFIcon from "../../assets/sqf.png";
import useRoundQuery from "../../hooks/roundQuery";
import useFlowingAmount from "../../hooks/flowingAmount";
import {
  TimeInterval,
  unitOfTime,
  fromTimeUnitsToSeconds,
  roundWeiAmount,
  formatNumberWithCommas,
} from "../../lib/utils";

interface MatchingPoolDetailsProps {
  flowRateToReceiver: string;
}

export default function MatchingPoolDetails(props: MatchingPoolDetailsProps) {
  const { flowRateToReceiver } = props;

  const { address } = useAccount();
  const { matchingData } = useRoundQuery();

  const userDistributionInfo = useMemo(() => {
    if (address && matchingData) {
      const index = matchingData.poolDistributors.findIndex(
        (distributor) => distributor.account.id === address.toLowerCase()
      );

      if (index > -1) {
        return {
          totalDistributedUserUntilUpdatedAt: BigInt(
            matchingData.poolDistributors[index]
              .totalAmountFlowedDistributedUntilUpdatedAt
          ),
          updatedAtTimestamp:
            matchingData.poolDistributors[index].updatedAtTimestamp,
          flowRate: BigInt(matchingData.poolDistributors[index].flowRate),
        };
      }
    }

    return null;
  }, [address, matchingData]);

  const totalDistributedUser = useFlowingAmount(
    userDistributionInfo?.totalDistributedUserUntilUpdatedAt ?? BigInt(0),
    userDistributionInfo?.updatedAtTimestamp ?? 0,
    userDistributionInfo?.flowRate ?? BigInt(0)
  );
  const totalDistributedAll = useFlowingAmount(
    BigInt(
      matchingData?.totalAmountFlowedDistributedUntilUpdatedAt ?? BigInt(0)
    ),
    matchingData?.updatedAtTimestamp ?? 0,
    BigInt(matchingData?.flowRate ?? 0)
  );

  return (
    <Stack direction="vertical" className="bg-blue rounded-4 p-2 pt-0">
      <Stack direction="horizontal" gap={2} className="align-items-end">
        <Image src={SQFIcon} alt="SQF" width={128} />
        <Card className="bg-transparent text-white border-0">
          <Card.Title className="text-secondary fs-4">
            Matching Stream
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
                  ETHx <br />
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
          href={"https://geoweb.network"}
          target="_blank"
          rel="noreferrer"
          className="ms-2 p-0"
        >
          <Image src={WebIcon} alt="Web" width={18} />
        </Button>
        <Button
          variant="link"
          href="https://twitter.com/thegeoweb"
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
              parseFloat(formatEther(totalDistributedUser).slice(0, 8))
            )}
          </Badge>
        </Stack>
        <Stack direction="vertical" gap={1} className="w-25">
          <Card.Text className="m-0 pe-0">All</Card.Text>
          <Badge className="bg-secondary rounded-1 p-1 text-start fs-5 fw-normal">
            {formatNumberWithCommas(
              parseFloat(formatEther(totalDistributedAll).slice(0, 8))
            )}
          </Badge>
        </Stack>
        <Stack direction="vertical" gap={1} className="w-25">
          <Card.Text className="m-0 pe-0">Others</Card.Text>
          <Badge className="bg-slate rounded-1 p-1 text-start fs-5 fw-normal">
            {formatNumberWithCommas(
              parseFloat(
                formatEther(totalDistributedAll - totalDistributedUser).slice(
                  0,
                  8
                )
              )
            )}
          </Badge>
        </Stack>
        <Card.Text className="w-20 mt-3">total funding</Card.Text>
      </Stack>
      <Card.Text className="m-0 p-2 fs-5" style={{ maxWidth: 500 }}>
        100% of Geo Web PCO land market revenue is allocated through streaming
        quadratic funding. You can help fund more public goods by opening a
        direct stream to the matching pool OR by claiming a parcel at{" "}
        <Card.Link
          href="https://geoweb.land"
          target="_blank"
          rel="noreferrer"
          className="text-decoration-none"
        >
          https://geoweb.land
        </Card.Link>
      </Card.Text>
    </Stack>
  );
}
