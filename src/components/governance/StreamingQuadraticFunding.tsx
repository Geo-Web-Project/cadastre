import { useState } from "react";
import { Address } from "viem";
import { useAccount } from "wagmi";
import Container from "react-bootstrap/Container";
import Stack from "react-bootstrap/Stack";
import Card from "react-bootstrap/Card";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Spinner from "react-bootstrap/Spinner";
import RotatePhoneIcon from "../../assets/rotate-phone.svg";
import FundMatchingPool from "./FundMatchingPool";
import Visualization from "./Visualization";
import FundGrantee from "./FundGrantee";
import useAllo from "../../hooks/allo";
import { useMediaQuery } from "../../hooks/mediaQuery";
import useEthPrice from "../../hooks/ethPrice";
import useRoundQuery from "../../hooks/roundQuery";

export type AllocationData = {
  flowRate: `${number}`;
  streamedUntilUpdatedAt: `${number}`;
  updatedAtTimestamp: number;
  activeIncomingStreamCount?: number;
};

export type UserTokenSnapshots = {
  token: Address;
  totalNetFlowRate: `${number}`;
  balanceUntilUpdatedAt: `${number}`;
  updatedAtTimestamp: number;
}[];

export type MatchingData = {
  totalUnits: `${number}`;
  flowRate: `${number}`;
  totalAmountFlowedDistributedUntilUpdatedAt: `${number}`;
  updatedAtTimestamp: number;
  members: Member[];
  poolDistributors: {
    account: { id: string };
    flowRate: `${number}`;
    totalAmountFlowedDistributedUntilUpdatedAt: `${number}`;
    updatedAtTimestamp: number;
  }[];
};

export type Member = {
  flowRate: `${number}`;
  units: `${number}`;
  totalAmountClaimed: `${number}`;
  updatedAtTimestamp: number;
};

export interface TransactionPanelState {
  show: boolean;
  isMatchingPool: boolean;
  granteeIndex: number | null;
}

export interface Grantee {
  name: string;
  description?: string;
  address?: string;
}

export default function StreamingQuadraticFunding() {
  const [transactionPanelState, setTransactionPanelState] =
    useState<TransactionPanelState>({
      show: false,
      granteeIndex: null,
      isMatchingPool: false,
    });

  const { isMobile, isTablet } = useMediaQuery();
  const { address } = useAccount();
  const { recipients, recipientsDetails } = useAllo();
  const { userAllocationData, directAllocationData, matchingData } =
    useRoundQuery(address);
  const ethPrice = useEthPrice();

  if (
    !recipients ||
    !recipientsDetails ||
    !userAllocationData ||
    !directAllocationData ||
    !matchingData
  ) {
    return (
      <Spinner
        animation="border"
        role="status"
        className="position-absolute top-50 start-50 text-white"
      ></Spinner>
    );
  }

  return (
    <Container fluid className="bg-purple">
      <Row>
        {transactionPanelState.show && transactionPanelState.isMatchingPool && (
          <Col sm="3" className="p-0">
            <FundMatchingPool
              setTransactionPanelState={setTransactionPanelState}
            />
          </Col>
        )}
        <Col
          xs={!isMobile && !isTablet && transactionPanelState.show ? "9" : 0}
          className="px-4"
        >
          <Stack direction="vertical" className="justify-content-stretch pt-3">
            <Card.Text className="d-flex fs-3 text-aqua mb-0">
              Streaming Quadratic Funding
            </Card.Text>
            <Card.Text className="text-white fs-4 mb-1">
              A quadratic funding round every second
            </Card.Text>
            <Card.Text className="text-info fs-5 mb-0">
              Low Power Mode - Pilot Completed on April 22
            </Card.Text>
          </Stack>
          {isMobile && (
            <Stack
              direction="horizontal"
              gap={2}
              className="align-items-center bg-dark text-white rounded-3 mt-3 p-2"
            >
              <Image src={RotatePhoneIcon} alt="rotate" />
              <Card.Text>See SQF allocated in real-time in landscape</Card.Text>
            </Stack>
          )}
          <Visualization
            transactionPanelState={transactionPanelState}
            setTransactionPanelState={setTransactionPanelState}
            recipientsDetails={recipientsDetails}
            userAllocationData={userAllocationData}
            directAllocationData={directAllocationData}
            matchingData={matchingData}
            ethPrice={ethPrice}
          />
        </Col>
        {transactionPanelState.show &&
          transactionPanelState.granteeIndex !== null && (
            <Col sm="3" className="p-0">
              <FundGrantee
                key={transactionPanelState.granteeIndex}
                ethPrice={ethPrice}
                userAllocationData={userAllocationData}
                directAllocationData={directAllocationData}
                matchingData={matchingData}
                granteeIndex={transactionPanelState.granteeIndex}
                setTransactionPanelState={setTransactionPanelState}
                name={
                  recipientsDetails[transactionPanelState.granteeIndex].name
                }
                image={
                  recipientsDetails[transactionPanelState.granteeIndex].image
                }
                website={
                  recipientsDetails[transactionPanelState.granteeIndex].website
                }
                social={
                  recipientsDetails[transactionPanelState.granteeIndex].social
                }
                recipientId={recipients[transactionPanelState.granteeIndex].id}
                granteeAddress={
                  recipients[transactionPanelState.granteeIndex].superApp
                }
                description={
                  recipientsDetails[transactionPanelState.granteeIndex]
                    .description
                }
              />
            </Col>
          )}
      </Row>
    </Container>
  );
}
