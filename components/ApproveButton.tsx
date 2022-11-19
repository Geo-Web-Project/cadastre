import * as React from "react";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import Image from "react-bootstrap/Image";
import { BigNumber } from "ethers";
import { SidebarProps } from "./Sidebar";
import { PAYMENT_TOKEN } from "../lib/constants";

export type ApproveButtonProps = SidebarProps & {
  isDisabled: boolean;
  requiredPayment: BigNumber | null;
  requiredFlowAmount: BigNumber | null;
  requiredFlowPermissions: number | null;
  spender: string | null;
  flowOperator: string | null;
  setErrorMessage: (v: string) => void;
  setIsActing: (v: boolean) => void;
  setDidFail: (v: boolean) => void;
  isAllowed: boolean;
  setIsAllowed: React.Dispatch<React.SetStateAction<boolean>>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asyncEvery = async (arr: any, predicate: any) => {
  for (const e of arr) {
    if (!(await predicate(e))) return false;
  }
  return true;
};

export function ApproveButton(props: ApproveButtonProps) {
  const {
    isDisabled,
    paymentToken,
    account,
    spender,
    provider,
    requiredPayment,
    sfFramework,
    requiredFlowPermissions,
    requiredFlowAmount,
    flowOperator,
    setErrorMessage,
    setIsActing,
    setDidFail,
    isAllowed,
    setIsAllowed,
  } = props;

  const [approvals, setApprovals] =
    React.useState<(() => Promise<boolean>)[]>([]);
  const [approvalStr, setApprovalStr] = React.useState<string>("");
  const [completedActions, setCompletedActions] = React.useState<number>(0);
  const [totalActions, setTotalActions] = React.useState<number>(0);

  const isReady =
    requiredPayment &&
    requiredFlowAmount &&
    requiredFlowPermissions &&
    spender &&
    flowOperator;

  const spinner = (
    <Spinner as="span" size="sm" animation="border" role="status">
      <span className="visually-hidden">Sending Transaction...</span>
    </Spinner>
  );

  const approvePayment = React.useCallback(async () => {
    if (!spender || !requiredPayment) {
      return true;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signer = provider.getSigner() as any;

    try {
      const op = paymentToken.approve({
        amount: requiredPayment.toString(),
        receiver: spender,
      });
      const txn = await op.exec(signer);
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
      setIsActing(false);
      setDidFail(true);
      return false;
    }

    return true;
  }, [spender, requiredPayment]);

  const approveFlowAllowance = React.useCallback(async () => {
    if (!flowOperator || !requiredFlowAmount) {
      return true;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signer = provider.getSigner() as any;

    try {
      const op = sfFramework.cfaV1.updateFlowOperatorPermissions({
        flowOperator: flowOperator,
        permissions: 3, // Create or update
        flowRateAllowance: requiredFlowAmount.toString(),
        superToken: paymentToken.address,
      });

      const txn = await op.exec(signer);
      await txn.wait();
    } catch (err) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      if (
        (err as any)?.code !== "TRANSACTION_REPLACED" ||
        (err as any).cancelled
      ) {
        console.error(err);
        setErrorMessage(
          (err as any).reason
            ? (err as any).reason.replace("execution reverted: ", "")
            : (err as Error).message
        );
        setIsActing(false);
        setDidFail(true);
        return false;
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }

    return true;
  }, [flowOperator, requiredFlowAmount]);

  React.useEffect(() => {
    const checkRequirements = async () => {
      const _approvals: (() => Promise<boolean>)[] = [];
      let _approvalStr = `Allow ${PAYMENT_TOKEN} Transfer`;

      if (!isReady) {
        setApprovals(_approvals);
        setApprovalStr(_approvalStr);
        return;
      }

      // Check required payment
      const allowance = await paymentToken.allowance({
        owner: account,
        spender: spender,
        providerOrSigner: sfFramework.settings.provider,
      });

      if (requiredPayment && BigNumber.from(allowance).lt(requiredPayment)) {
        _approvals.push(approvePayment);
        _approvalStr = `Allow ${PAYMENT_TOKEN} Transfer`;
      }

      // Check flow allowance
      const flowOperatorData = await sfFramework.cfaV1.getFlowOperatorData({
        superToken: paymentToken.address,
        flowOperator: flowOperator,
        sender: account,
        providerOrSigner: sfFramework.settings.provider,
      });

      if (
        requiredFlowAmount &&
        requiredFlowPermissions &&
        (BigNumber.from(flowOperatorData.flowRateAllowance).lt(
          requiredFlowAmount
        ) ||
          Number(flowOperatorData.permissions) < requiredFlowPermissions)
      ) {
        _approvals.push(approveFlowAllowance);
        _approvalStr =
          _approvals.length > 1
            ? `Allow ${PAYMENT_TOKEN} Transfer + Stream`
            : `Allow ${PAYMENT_TOKEN} Stream`;
      }

      if (_approvals.length === 0) {
        setIsAllowed(true);
      } else {
        setIsAllowed(false);
      }

      setApprovals(_approvals);
      setApprovalStr(_approvalStr);
    };

    checkRequirements();
  }, [
    paymentToken,
    account,
    spender,
    flowOperator,
    provider,
    requiredPayment,
    completedActions,
  ]);

  const submit = React.useCallback(async () => {
    if (approvals.length > 0) {
      setTotalActions(approvals.length);
      setCompletedActions(0);
      let _completedActions = 0;
      const isSubmissionSuccessful = await asyncEvery(
        approvals,
        async (f: () => Promise<boolean>) => {
          const success = await f();
          setCompletedActions(++_completedActions);
          return success;
        }
      );

      if (!isSubmissionSuccessful) {
        setCompletedActions(0);
        setTotalActions(0);
      }
    }
  }, [approvals, completedActions]);

  return (
    <Button
      variant={isAllowed ? "info" : "primary"}
      className="w-100 mb-3"
      onClick={() => submit()}
      disabled={
        isDisabled || !isReady || isAllowed || totalActions > completedActions
      }
    >
      {isAllowed ? (
        <>
          <span className="ms-4">{PAYMENT_TOKEN} use allowed</span>
          <Image src="./task-done.svg" className="float-end"></Image>
        </>
      ) : totalActions > completedActions ? (
        <>
          {spinner} {`${completedActions}/${totalActions}`}
        </>
      ) : (
        approvalStr
      )}
    </Button>
  );
}

export default ApproveButton;
