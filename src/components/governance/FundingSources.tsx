import { formatEther } from "viem";
import Stack from "react-bootstrap/Stack";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import DAIWhite from "../../assets/dai-white.svg";
import ETHWhite from "../../assets/eth-white.svg";
import ContributionsIcon from "../../assets/contributions.svg";
import HandIcon from "../../assets/hand.svg";
import { VisualizationProps, Dimensions } from "./Visualization";
import useFlowingAmount from "../../hooks/flowingAmount";
import { useMediaQuery } from "../../hooks/mediaQuery";
import { perSecondToPerMonth, formatNumberWithCommas } from "../../lib/utils";
import { VIZ_CARD_WIDTH_SOURCE } from "../../lib/constants";

type FundingSourcesProps = VisualizationProps & {
  dimensions: Dimensions;
  startYScale: (n: number) => number;
  symbolsPerSecondAllocation: number;
  symbolsPerSecondMatching: number;
};

export default function FundingSources(props: FundingSourcesProps) {
  const {
    dimensions,
    startYScale,
    symbolsPerSecondAllocation,
    symbolsPerSecondMatching,
    userAllocationData,
    directAllocationData,
    matchingData,
    transactionPanelState,
    setTransactionPanelState,
  } = props;

  const { isMobile } = useMediaQuery();

  const average = (array: bigint[]) => {
    const length = array.filter((n) => n !== BigInt(0)).length;

    if (length === 0) {
      return BigInt(0);
    }

    return array.reduce((a, b) => a + b) / BigInt(length);
  };
  const cumSum = (array: bigint[]) => array.reduce((a, b) => a + b);
  const totalFlowRateUser = cumSum(
    userAllocationData.map((elem) => BigInt(elem.flowRate))
  );
  const totalFlowRateDirect =
    cumSum(directAllocationData.map((elem) => BigInt(elem.flowRate))) -
    totalFlowRateUser;
  const totalStreamedUntilUpdatedUser = cumSum(
    userAllocationData.map((elem) => BigInt(elem.streamedUntilUpdatedAt))
  );
  const totalStreamedUntilUpdatedDirect =
    cumSum(
      directAllocationData.map((elem) => BigInt(elem.streamedUntilUpdatedAt))
    ) - totalStreamedUntilUpdatedUser;
  const totalStreamedUserAllocation = useFlowingAmount(
    totalStreamedUntilUpdatedUser,
    Number(
      average(userAllocationData.map((elem) => BigInt(elem.updatedAtTimestamp)))
    ),
    totalFlowRateUser
  );
  const totalStreamedDirectAllocation = useFlowingAmount(
    totalStreamedUntilUpdatedDirect,
    Number(
      average(
        directAllocationData.map((elem) => BigInt(elem.updatedAtTimestamp))
      )
    ),
    totalFlowRateDirect
  );
  const totalStreamedMatching = useFlowingAmount(
    BigInt(matchingData.totalAmountFlowedDistributedUntilUpdatedAt),
    matchingData.updatedAtTimestamp,
    BigInt(matchingData.flowRate)
  );
  const totalFlowRateAllocated =
    Number(formatEther(totalFlowRateUser)) +
    Number(formatEther(totalFlowRateDirect));
  const totalFlowRateMatching = Number(
    formatEther(BigInt(matchingData.flowRate))
  );
  const calcSymbolValue = (amount: number, symbolsPerSecond: number) =>
    amount / symbolsPerSecond;
  const contributionsCountUser = userAllocationData.filter(
    (elem) => BigInt(elem.flowRate) !== BigInt(0)
  ).length;
  const contributionsCountDirect =
    directAllocationData.reduce(
      (acc, elem) => acc + (elem?.activeIncomingStreamCount ?? 0),
      0
    ) - contributionsCountUser;

  return (
    <>
      {isMobile && (
        <Button variant="transparent" className="d-flex align-items-center p-0">
          <Card.Text className="text-info mt-4 mb-2">Funding Sources</Card.Text>
        </Button>
      )}
      {!transactionPanelState.isMatchingPool || window.innerWidth > 800 ? (
        <Stack
          direction="vertical"
          gap={isMobile ? 3 : 0}
          className="text-white position-relative"
          style={{
            width: isMobile ? "100%" : VIZ_CARD_WIDTH_SOURCE,
            height: isMobile ? "auto" : dimensions.height,
          }}
        >
          <Card
            className={`w-100 bg-aqua border-0 ${
              isMobile ? "rounded-3" : "rounded-0 rounded-start-3"
            } px-2 py-1 text-white`}
            style={{
              position: isMobile ? "static" : "absolute",
              top: startYScale(0) - 95,
              height: isMobile ? 100 : dimensions.pathHeight,
            }}
          >
            <Card.Header
              className={`p-0 border-0 ${isMobile ? "fs-3" : "fs-4"}`}
            >
              You
            </Card.Header>
            <Card.Body
              className={`d-flex flex-column justify-content-center gap-1 p-0 pb-1 ${
                isMobile ? "fs-5" : "fs-6"
              }`}
            >
              <Stack
                direction="horizontal"
                gap={1}
                className="align-items-center"
              >
                <Image src={DAIWhite} alt="dai" width={isMobile ? 16 : 14} />
                <Badge
                  className={`w-75 m-0 rounded-1 px-1 bg-aqua text-white fw-normal text-start ${
                    isMobile ? "fs-5" : "fs-6"
                  }`}
                  style={{
                    background:
                      "linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.25))",
                  }}
                >
                  {formatNumberWithCommas(
                    parseFloat(
                      perSecondToPerMonth(
                        Number(formatEther(totalFlowRateUser))
                      ).toFixed(6)
                    )
                  )}
                </Badge>
                <Card.Text className="w-25 m-0">/month</Card.Text>
              </Stack>
              <Stack
                direction="horizontal"
                gap={1}
                className="align-items-center"
              >
                <Image src={DAIWhite} alt="dai" width={isMobile ? 16 : 14} />
                <Badge
                  className={`w-75 m-0 rounded-1 px-1 bg-aqua text-white fw-normal text-start ${
                    isMobile ? "fs-5" : "fs-6"
                  }`}
                  style={{
                    background:
                      "linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.25))",
                  }}
                >
                  {formatNumberWithCommas(
                    parseFloat(
                      formatEther(totalStreamedUserAllocation).slice(0, 8)
                    )
                  )}
                </Badge>
                <Card.Text className="w-25 m-0"> total</Card.Text>
              </Stack>
            </Card.Body>
          </Card>
          <Card
            className={`w-100 bg-secondary border-0 ${
              isMobile ? "rounded-3" : "rounded-0 rounded-start-3"
            } px-2 py-1 text-white`}
            style={{
              position: isMobile ? "static" : "absolute",
              top: startYScale(1) - 95,
              width: VIZ_CARD_WIDTH_SOURCE,
              height: isMobile ? 100 : dimensions.pathHeight,
            }}
          >
            <Stack
              direction="horizontal"
              className="justify-content-between align-items-center"
            >
              <Card.Header
                className={`d-flex p-0 border-0 w-100 ${
                  isMobile ? "fs-3" : "fs-4"
                }`}
              >
                Direct Funders
              </Card.Header>
              <Stack
                direction="vertical"
                className={`align-items-center opacity-50 ${
                  isMobile ? "fs-5" : "fs-6"
                }`}
              >
                {contributionsCountDirect}
                <Image
                  src={ContributionsIcon}
                  alt="contributions"
                  width={isMobile ? 18 : 16}
                />
              </Stack>
            </Stack>
            <Card.Body
              className={`d-flex flex-column justify-content-center gap-1 p-0 ${
                isMobile ? "fs-5" : "fs-6"
              }`}
            >
              <Stack
                direction="horizontal"
                gap={1}
                className="align-items-center"
              >
                <Image src={DAIWhite} alt="dai" width={isMobile ? 16 : 14} />
                <Badge
                  className={`w-75 m-0 rounded-1 px-1 bg-secondary text-white fw-normal text-start ${
                    isMobile ? "fs-5" : "fs-6"
                  }`}
                  style={{
                    background:
                      "linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.25))",
                  }}
                >
                  {formatNumberWithCommas(
                    parseFloat(
                      perSecondToPerMonth(
                        Number(formatEther(totalFlowRateDirect))
                      ).toFixed(6)
                    )
                  )}
                </Badge>
                <Card.Text className="w-25 m-0">/month</Card.Text>
              </Stack>
              <Stack
                direction="horizontal"
                gap={1}
                className="align-items-center"
              >
                <Image src={DAIWhite} alt="dai" width={isMobile ? 16 : 14} />
                <Badge
                  className={`w-75 m-0 rounded-1 px-1 bg-secondary text-white fw-normal text-start ${
                    isMobile ? "fs-5" : "fs-6"
                  }`}
                  style={{
                    background:
                      "linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.25))",
                  }}
                >
                  {formatNumberWithCommas(
                    parseFloat(
                      formatEther(totalStreamedDirectAllocation).slice(0, 8)
                    )
                  )}{" "}
                </Badge>
                <Card.Text className="w-25 m-0"> total</Card.Text>
              </Stack>
            </Card.Body>
          </Card>
          <Card
            className={`w-100 bg-slate border-0 ${
              isMobile ? "rounded-3" : "rounded-0 rounded-start-3"
            } p-0 pe-1 text-white`}
            style={{
              position: isMobile ? "static" : "absolute",
              top: startYScale(2) - 95,
              width: VIZ_CARD_WIDTH_SOURCE,
              height: isMobile ? 100 : dimensions.pathHeight,
            }}
          >
            <Stack direction="horizontal" gap={2} className="h-100 p-1">
              <Button
                variant="success"
                className="d-flex flex-column justify-content-center h-100 p-0 fs-3 text-white fw-bold"
                onClick={() => {
                  setTransactionPanelState({
                    show: true,
                    isMatchingPool: true,
                    granteeIndex: null,
                  });
                }}
              >
                <Image src={HandIcon} alt="hand" width={26} />
              </Button>
              <Stack direction="vertical" gap={2} className="ms-1">
                <Stack
                  direction="horizontal"
                  className="justify-content-between align-items-center"
                >
                  <Card.Header
                    className={`p-0 border-0 w-100 ${
                      isMobile ? "fs-3" : "fs-4"
                    }`}
                    style={{ lineHeight: "18px" }}
                  >
                    Quadratic Matching
                  </Card.Header>
                  <Stack
                    direction="vertical"
                    className={`align-items-center opacity-50 ${
                      isMobile ? "fs-5" : "fs-6"
                    }`}
                  >
                    {
                      matchingData.poolDistributors.filter(
                        (elem) => BigInt(elem.flowRate) > 0
                      ).length
                    }
                    <Image
                      src={ContributionsIcon}
                      alt="contributions"
                      width={isMobile ? 18 : 16}
                    />
                  </Stack>
                </Stack>
                <Card.Body
                  className={`d-flex flex-column justify-content-center gap-1 p-0 ${
                    isMobile ? "fs-5" : "fs-6"
                  }`}
                >
                  <Stack
                    direction="horizontal"
                    gap={1}
                    className="align-items-center"
                  >
                    <Image src={ETHWhite} alt="eth" width={isMobile ? 9 : 8} />
                    <Badge
                      className={`w-75 m-0 rounded-1 px-1 bg-slate text-start fw-normal text-white ${
                        isMobile ? "fs-5" : "fs-6"
                      }`}
                      style={{
                        background:
                          "linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.25))",
                      }}
                    >
                      {formatNumberWithCommas(
                        parseFloat(
                          perSecondToPerMonth(totalFlowRateMatching).toFixed(6)
                        )
                      )}
                    </Badge>
                    <Card.Text className="w-25 m-0">/month</Card.Text>
                  </Stack>
                  <Stack
                    direction="horizontal"
                    gap={1}
                    className="align-items-center"
                  >
                    <Image
                      src={ETHWhite}
                      alt="eth"
                      width={isMobile ? 9 : 8}
                      className="py-1"
                    />
                    <Badge
                      className={`w-75 m-0 rounded-1 px-1 bg-slate text-start fw-normal text-white ${
                        isMobile ? "fs-5" : "fs-6"
                      }`}
                      style={{
                        background:
                          "linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.25))",
                      }}
                    >
                      {formatNumberWithCommas(
                        parseFloat(
                          formatEther(totalStreamedMatching).slice(0, 8)
                        )
                      )}
                    </Badge>
                    <Card.Text className="w-25 m-0">total</Card.Text>
                  </Stack>
                </Card.Body>
              </Stack>
            </Stack>
          </Card>
          {!isMobile && (
            <Card
              className="bg-blue text-white mt-4 px-2"
              style={{
                position: isMobile ? "static" : "absolute",
                width: window.innerWidth > 1200 ? 340 : 256,
                bottom:
                  window.innerHeight < 1080
                    ? 85
                    : window.innerHeight === 1080
                    ? 75
                    : 110,
              }}
            >
              <Card.Header className="text-secondary border-purple px-0 py-1">
                Legend
              </Card.Header>
              <Card.Body className="d-flex justify-content-between align-items-center px-0 py-2 fs-5">
                <Stack direction="horizontal">
                  <Card.Img
                    variant="start"
                    src={DAIWhite}
                    width={24}
                    className="pe-1"
                  />
                  <Card.Text className="mb-0 me-3">
                    ={" "}
                    {totalFlowRateAllocated
                      ? calcSymbolValue(
                          totalFlowRateAllocated,
                          symbolsPerSecondAllocation
                        )
                          .toFixed(8)
                          .replace(/\.?0+$/, "")
                      : 0}{" "}
                    {window.innerWidth > 1200 ? "DAIx" : ""}
                  </Card.Text>
                </Stack>
                <Stack direction="horizontal">
                  <Card.Img
                    variant="start"
                    className="m-0 p-0 pe-2"
                    src={ETHWhite}
                    width={20}
                  />
                  <Card.Text className="mb-0">
                    ={" "}
                    {totalFlowRateMatching
                      ? calcSymbolValue(
                          totalFlowRateMatching,
                          symbolsPerSecondMatching
                        )
                          .toFixed(11)
                          .replace(/\.?0+$/, "")
                      : 0}{" "}
                    {window.innerWidth > 1200 ? "ETHx" : ""}
                  </Card.Text>
                </Stack>
              </Card.Body>
            </Card>
          )}
        </Stack>
      ) : null}
    </>
  );
}
