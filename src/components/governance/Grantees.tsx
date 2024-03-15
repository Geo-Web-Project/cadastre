import { parseEther, formatEther } from "viem";
import Stack from "react-bootstrap/Stack";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Badge from "react-bootstrap/Badge";
import HandIcon from "../../assets/hand.svg";
import ContributionsIcon from "../../assets/contributions.svg";
import { Dimensions } from "./Visualization";
import {
  TransactionPanelState,
  AllocationData,
  MatchingData,
} from "./StreamingQuadraticFunding";
import {
  clampText,
  perSecondToPerMonth,
  formatNumberWithCommas,
  fromTimeUnitsToSeconds,
} from "../../lib/utils";
import { useMediaQuery } from "../../hooks/mediaQuery";
import { calcMatchingImpactEstimate } from "../../lib/governance/matchingImpactEstimate";
import { VIZ_CARD_WIDTH_GRANTEE } from "../../lib/constants";

interface GranteesProps {
  dimensions: Dimensions;
  endYScale: (n: number) => number;
  userAllocationData: AllocationData[];
  directAllocationData: AllocationData[];
  matchingData: MatchingData;
  grantees: string[];
  descriptions: string[];
  transactionPanelState: TransactionPanelState;
  setTransactionPanelState: React.Dispatch<
    React.SetStateAction<TransactionPanelState>
  >;
  ethPrice?: number;
}

export default function Grantees(props: GranteesProps) {
  const {
    dimensions,
    endYScale,
    userAllocationData,
    directAllocationData,
    matchingData,
    grantees,
    descriptions,
    transactionPanelState,
    setTransactionPanelState,
    ethPrice,
  } = props;

  const { isMobile } = useMediaQuery();

  const calcSampleMultiplier = (granteeIndex: number) => {
    return ethPrice
      ? parseFloat(
          (
            (Number(
              calcMatchingImpactEstimate({
                totalFlowRate: BigInt(matchingData?.flowRate ?? 0),
                totalUnits: BigInt(matchingData?.totalUnits ?? 0),
                granteeUnits: matchingData
                  ? BigInt(matchingData.members[granteeIndex].units)
                  : BigInt(0),
                granteeFlowRate: matchingData
                  ? BigInt(matchingData.members[granteeIndex].flowRate)
                  : BigInt(0),
                previousFlowRate: BigInt(0),
                newFlowRate:
                  parseEther("1") / BigInt(fromTimeUnitsToSeconds(1, "months")),
              })
            ) *
              ethPrice) /
            Number(
              parseEther("1") / BigInt(fromTimeUnitsToSeconds(1, "months"))
            )
          ).toFixed(0)
        )
      : 0;
  };

  return (
    <>
      {isMobile && (
        <Card.Text className="text-info mt-4 mb-2">Grantees</Card.Text>
      )}
      {transactionPanelState.granteeIndex === null ||
      window.innerWidth > 800 ? (
        <Stack
          direction="vertical"
          gap={isMobile ? 3 : 0}
          className="text-white position-relative pb-4 pb-sm-0"
          style={{
            width: isMobile ? "100%" : VIZ_CARD_WIDTH_GRANTEE,
            height: isMobile ? "auto" : dimensions.height,
          }}
        >
          {grantees.map((grantee, i) => (
            <Stack
              direction="horizontal"
              gap={2}
              className={`justify-content-even border bg-blue border-0 ${
                isMobile ? "rounded-3" : "rounded-0 rounded-end-3"
              } px-2 py-1`}
              style={{
                position: isMobile ? "static" : "absolute",
                top: endYScale(i) - 95,
                width: isMobile ? "100%" : VIZ_CARD_WIDTH_GRANTEE,
                height: isMobile ? 110 : dimensions.pathHeight + 1,
                zIndex: 1,
              }}
              key={i}
            >
              <Button
                variant="success"
                className="d-flex flex-column justify-content-center align-items-center gap-1 w-25 h-100 px-0 py-2 fs-5 text-white"
                onClick={() =>
                  setTransactionPanelState({
                    show: true,
                    isMatchingPool: false,
                    granteeIndex: i,
                  })
                }
              >
                <Stack direction="vertical">
                  <Card.Text className="m-0 mt-2 mt-sm-0 fs-6">
                    1 DAI Match
                  </Card.Text>
                  <Card.Text className="m-0 fs-5">
                    {ethPrice ? `~${calcSampleMultiplier(i)}x` : "N/A"}
                  </Card.Text>
                </Stack>
                <Image
                  src={HandIcon}
                  alt="donate"
                  width={26}
                  className="h-100"
                />
              </Button>
              <Card className="w-100 w-sm-75 h-100 px-1 bg-transparent text-white border-0">
                <Card.Title
                  className={`m-0 mb-1 p-0 ${isMobile ? "fs-3" : "fs-4"}`}
                >
                  {grantee}
                </Card.Title>
                <Stack
                  direction="horizontal"
                  gap={2}
                  className="justify-content-between"
                >
                  <Stack
                    direction="vertical"
                    className={`align-items-center opacity-50 text-white ${
                      isMobile ? "fs-5" : "fs-6"
                    }`}
                  >
                    {directAllocationData[i].activeIncomingStreamCount}
                    <Image
                      src={ContributionsIcon}
                      alt="contributions"
                      width={isMobile ? 22 : 16}
                    />
                  </Stack>
                  <Card.Subtitle
                    as="p"
                    className={`d-block p-0 m-0 mb-1 text-info text-wrap text-break text-truncate lh-md ${
                      isMobile ? "fs-4" : "fs-5"
                    }`}
                  >
                    {clampText(
                      descriptions[i],
                      isMobile && document.documentElement.clientWidth > 400
                        ? 50
                        : isMobile
                        ? 42
                        : 46
                    )}
                  </Card.Subtitle>
                </Stack>
                <Stack
                  direction="horizontal"
                  gap={1}
                  className={`align-items-center m-0 p-0 ${
                    isMobile ? "fs-5" : "fs-6"
                  }`}
                >
                  <Badge className="bg-aqua w-25 rounded-1 text-start fw-normal fs-6">
                    {BigInt(userAllocationData[i].flowRate) > 0
                      ? formatNumberWithCommas(
                          parseFloat(
                            perSecondToPerMonth(
                              Number(
                                formatEther(
                                  BigInt(userAllocationData[i].flowRate)
                                )
                              )
                            ).toFixed(6)
                          )
                        )
                      : 0}{" "}
                  </Badge>
                  <Badge className="bg-secondary w-25 rounded-1 px-1 text-start fw-normal fs-6">
                    {BigInt(directAllocationData[i].flowRate) > 0
                      ? formatNumberWithCommas(
                          parseFloat(
                            perSecondToPerMonth(
                              Number(
                                formatEther(
                                  BigInt(directAllocationData[i].flowRate) -
                                    BigInt(userAllocationData[i].flowRate)
                                )
                              )
                            ).toFixed(6)
                          )
                        )
                      : 0}{" "}
                  </Badge>
                  <Badge className="bg-slate w-25 rounded-1 px-1 text-start fw-normal fs-6">
                    {BigInt(matchingData.members[i].flowRate) > 0
                      ? formatNumberWithCommas(
                          parseFloat(
                            perSecondToPerMonth(
                              Number(
                                formatEther(
                                  BigInt(matchingData.members[i].flowRate)
                                )
                              )
                            ).toFixed(6)
                          )
                        )
                      : 0}{" "}
                  </Badge>
                  <Card.Text className="m-0">/month</Card.Text>
                </Stack>
              </Card>
            </Stack>
          ))}
        </Stack>
      ) : null}
    </>
  );
}
