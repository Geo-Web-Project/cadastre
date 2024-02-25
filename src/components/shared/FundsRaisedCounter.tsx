import { useState, useEffect } from "react";
import { formatEther } from "viem";
import { getContractsForChainOrThrow } from "@geo-web/sdk";
import Spinner from "react-bootstrap/Spinner";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { sfSubgraph } from "../../redux/store";
import { useEthersProvider } from "../../hooks/ethersAdapters";
import useFlowingAmount from "../../hooks/flowingAmount";
import { NETWORK_ID } from "../../lib/constants";
import { truncateEth } from "../../lib/truncate";

function FundsRaisedCounter() {
  const [beneficiaryAddress, setBeneficiaryAddress] = useState("");

  const ethersProvider = useEthersProvider();
  const { isLoading, data } = sfSubgraph.useAccountTokenSnapshotsQuery(
    {
      chainId: NETWORK_ID,
      filter: {
        account: beneficiaryAddress,
      },
    },
    {
      pollingInterval: 5000,
      skip: !beneficiaryAddress,
    }
  );
  const accountTokenSnapshot = data?.items[0];
  const amount = useFlowingAmount(
    BigInt(accountTokenSnapshot?.totalAmountStreamedInUntilUpdatedAt ?? 0) +
      BigInt(accountTokenSnapshot?.totalAmountTransferredUntilUpdatedAt ?? 0),
    accountTokenSnapshot?.updatedAtTimestamp ?? 0,
    BigInt(accountTokenSnapshot?.totalInflowRate ?? 0)
  );

  useEffect(() => {
    (async () => {
      if (ethersProvider) {
        const { registryDiamondContract } = getContractsForChainOrThrow(
          NETWORK_ID,
          ethersProvider
        );
        const _beneficiaryAddress =
          await registryDiamondContract.getBeneficiary();

        setBeneficiaryAddress(_beneficiaryAddress);
      }
    })();
  }, [ethersProvider]);

  return (
    <OverlayTrigger
      trigger={["hover", "focus"]}
      placement="bottom"
      overlay={
        <Tooltip>
          The Geo Web land market generates streaming funding for public goods.
          You can help allocate it in real-time on the Governance tab.
        </Tooltip>
      }
    >
      {!beneficiaryAddress || isLoading || !data ? (
        <div className="d-flex justify-content-center p-3">
          <Spinner animation="border" role="status" variant="light"></Spinner>
        </div>
      ) : (
        <div className="fs-1 text-primary text-center lh-1">
          {truncateEth(formatEther(amount), 4)} ETHx
          <div className="text-light text-center">
            <span className="d-none d-sm-block my-2 fs-4">
              Public Goods Funding Raised
            </span>
            <span className="d-sm-none" style={{ fontSize: "0.8rem" }}>
              Public Goods Funding Raised
            </span>
          </div>
        </div>
      )}
    </OverlayTrigger>
  );
}

export default FundsRaisedCounter;
