import { formatEther } from "viem";
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
import { clampText, perSecondToPerMonth } from "../../lib/utils";
import { VIZ_CARD_WIDTH_GRANTEE } from "../../lib/constants";

interface GranteesProps {
  dimensions: Dimensions;
  endYScale: (n: number) => number;
  userAllocationData: AllocationData[];
  directAllocationData: AllocationData[];
  matchingData: MatchingData;
  grantees: string[];
  descriptions: string[];
  setTransactionPanelState: React.Dispatch<
    React.SetStateAction<TransactionPanelState>
  >;
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
    setTransactionPanelState,
  } = props;

  return (
    <Stack
      direction="vertical"
      className="text-white position-relative"
      style={{ width: VIZ_CARD_WIDTH_GRANTEE, height: dimensions.height }}
    >
      {grantees.map((grantee, i) => (
        <Stack
          direction="horizontal"
          gap={1}
          className="justify-content-even border bg-blue border-0 rounded-0 rounded-end px-2 py-1"
          style={{
            position: "absolute",
            top: endYScale(i) - 95,
            width: VIZ_CARD_WIDTH_GRANTEE,
            height: dimensions.pathHeight + 1,
            zIndex: 1,
          }}
          key={i}
        >
          <Button
            variant="success"
            className="d-flex flex-column justify-content-center align-items-center h-100 p-0 fs-3 text-white fw-bold"
            onClick={() =>
              setTransactionPanelState({
                show: true,
                isMatchingPool: false,
                granteeIndex: i,
              })
            }
          >
            <Image src={HandIcon} alt="donate" width={26} />
          </Button>
          <Card className="h-100 px-1 bg-transparent text-white border-0">
            <Card.Title className="m-0 mb-1 p-0 fs-4">{grantee}</Card.Title>
            <Stack
              direction="horizontal"
              gap={2}
              className="justify-content-between"
            >
              <Stack
                direction="vertical"
                className="align-items-center fs-6 opacity-50 text-white"
              >
                {directAllocationData[i].activeIncomingStreamCount}
                <Image src={ContributionsIcon} alt="contributions" width={16} />
              </Stack>
              <Card.Subtitle
                as="p"
                className="d-block p-0 m-0 mb-1 fs-5 text-info text-wrap text-break text-truncate lh-md"
              >
                {clampText(descriptions[i], 56)}
              </Card.Subtitle>
            </Stack>
            <Stack
              direction="horizontal"
              gap={1}
              className="align-items-center fs-6 m-0 p-0"
            >
              <Badge className="bg-aqua w-25 rounded-1 fs-6 text-start fw-normal">
                {BigInt(userAllocationData[i].flowRate) > 0
                  ? parseFloat(
                      perSecondToPerMonth(
                        Number(
                          formatEther(BigInt(userAllocationData[i].flowRate))
                        )
                      ).toFixed(6)
                    )
                  : 0}{" "}
              </Badge>
              <Badge className="bg-secondary w-25 rounded-1 px-1 fs-6 text-start fw-normal">
                {BigInt(directAllocationData[i].flowRate) > 0
                  ? parseFloat(
                      perSecondToPerMonth(
                        Number(
                          formatEther(
                            BigInt(directAllocationData[i].flowRate) -
                              BigInt(userAllocationData[i].flowRate)
                          )
                        )
                      ).toFixed(6)
                    )
                  : 0}{" "}
              </Badge>
              <Badge className="bg-slate w-25 rounded-1 px-1 fs-6 text-start fw-normal">
                {BigInt(matchingData.members[i].flowRate) > 0
                  ? parseFloat(
                      perSecondToPerMonth(
                        Number(
                          formatEther(BigInt(matchingData.members[i].flowRate))
                        )
                      ).toFixed(6)
                    )
                  : 0}{" "}
              </Badge>
              <Card.Text className="m-0">/month</Card.Text>
            </Stack>
          </Card>
        </Stack>
      ))}
    </Stack>
  );
}
