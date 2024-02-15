import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import Offcanvas from "react-bootstrap/Offcanvas";
import Stack from "react-bootstrap/Stack";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Spinner from "react-bootstrap/Spinner";
import MatchingPoolDetails from "./MatchingPoolDetails";
import EditStream from "./EditStream";
import { TransactionPanelState } from "./StreamingQuadraticFunding";
import CloseIcon from "../../assets/close.svg";
import useSuperfluid from "../../hooks/superfluid";
import useAllo from "../../hooks/allo";
import useRoundQuery from "../../hooks/roundQuery";

interface FundMatchingPoolProps {
  setTransactionPanelState: React.Dispatch<
    React.SetStateAction<TransactionPanelState>
  >;
}

export default function FundMatchingPool(props: FundMatchingPoolProps) {
  const { setTransactionPanelState } = props;

  const [newFlowRate, setNewFlowRate] = useState("");

  const { address } = useAccount();
  const { gdaDistributeFlow, nativeSuperToken } = useSuperfluid(address);
  const { gdaPool } = useAllo();
  const { matchingData } = useRoundQuery();

  const flowRateToReceiver = useMemo(() => {
    if (address && matchingData) {
      const index = matchingData.poolDistributors.findIndex(
        (distributor: { account: { id: string } }) =>
          distributor.account.id === address.toLowerCase()
      );

      if (index > -1) {
        return matchingData.poolDistributors[index].flowRate;
      }
    }

    return "0";
  }, [address, matchingData]);

  const closeOffcanvas = () =>
    setTransactionPanelState({
      show: false,
      isMatchingPool: false,
      granteeIndex: null,
    });

  if (!nativeSuperToken) {
    return (
      <Spinner
        animation="border"
        role="status"
        className="position-relative top-50 start-50 text-white"
      ></Spinner>
    );
  }

  return (
    <Offcanvas
      show
      scroll
      onHide={closeOffcanvas}
      placement="start"
      backdrop={false}
      className="w-25 bg-dark px-3 overflow-auto border-0"
      style={{ top: 77 }}
    >
      <Stack
        direction="horizontal"
        className="justify-content-between align-items-center py-2 text-white"
      >
        <Card.Text className="fs-3 m-0">Fund Matching Pool</Card.Text>
        <Button
          variant="transparent"
          className="position-absolute end-0 px-2 py-0"
          onClick={closeOffcanvas}
        >
          <Image src={CloseIcon} alt="close" width={28} />
        </Button>
      </Stack>
      <Stack
        direction="vertical"
        gap={4}
        className="rounded-4 text-white pb-3 flex-grow-0"
      >
        <MatchingPoolDetails
          flowRateToReceiver={flowRateToReceiver}
          {...props}
        />
        <EditStream
          granteeName="GDA Matching Pool"
          receiver={gdaPool ?? "0x"}
          flowRateToReceiver={flowRateToReceiver}
          granteeIndex={null}
          newFlowRate={newFlowRate}
          setNewFlowRate={setNewFlowRate}
          isFundingMatchingPool={true}
          transactionsToQueue={[
            async () =>
              await gdaDistributeFlow(
                nativeSuperToken,
                newFlowRate,
                gdaPool ?? "0x"
              ),
          ]}
        />
      </Stack>
    </Offcanvas>
  );
}
