import * as React from "react";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { BigNumber, constants } from "ethers";
import { SidebarProps } from "./Sidebar";
import { PAYMENT_TOKEN } from "../lib/constants";

export type ApproveOrPerformButtonProps = SidebarProps & {
  isDisabled: boolean;
  performAction: () => Promise<string | void>;
  buttonText: string;
  requiredPayment: BigNumber | null;
  requiredFlowAmount: BigNumber | null;
  requiredFlowPermissions: number | null;
  spender: string | null;
  flowOperator: string | null;
  setErrorMessage: (v: string) => void;
  setIsActing: (v: boolean) => void;
  setDidFail: (v: boolean) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asyncEvery = async (arr: any, predicate: any) => {
  for (const e of arr) {
    if (!(await predicate(e))) return false;
  }
  return true;
};

export function ApproveOrPerformButton(props: ApproveOrPerformButtonProps) {
  const {
    isDisabled,
    performAction,
    buttonText,
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
  } = props;

  const [approvals, setApprovals] = React.useState<(() => Promise<boolean>)[]>(
    []
  );
  const [approvalStr, setApprovalStr] = React.useState<string>(buttonText);
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
    if (!spender) {
      return true;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signer = provider.getSigner() as any;

    try {
      const op = paymentToken.approve({
        amount: constants.MaxUint256.toString(),
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
  }, [spender]);

  const approveFlowAllowance = React.useCallback(async () => {
    if (!flowOperator) {
      return true;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signer = provider.getSigner() as any;

    try {
      const op = sfFramework.cfaV1.authorizeFlowOperatorWithFullControl({
        superToken: paymentToken.address,
        flowOperator: flowOperator,
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
  }, [flowOperator]);

  const approveFlowAllowance = async () => {
    const signer = provider.getSigner() as any;

    try {
      const flowOperator = await registryContract.getNextProxyAddress(account);
      const op = sfFramework.cfaV1.authorizeFlowOperatorWithFullControl({
        superToken: paymentToken.address,
        flowOperator: flowOperator,
      });

      const txn = await op.exec(signer);
      await txn.wait();
    } catch (err) {
      console.error(err);
      updateActionData({
        isActing: false,
        didFail: true,
        errorMessage: (err as any).reason
          ? (err as any).reason.replace("execution reverted: ", "")
          : (err as Error).message,
      });
      return false;
    }

    return true;
  };

  React.useEffect(() => {
    const checkRequirements = async () => {
      const _approvals: (() => Promise<boolean>)[] = [];
      let _approvalStr = buttonText;

      if (!isReady) {
        setApprovals(_approvals);
        setApprovalStr(_approvalStr);
        return;
      }

      // Check required payment
      const allowance = await paymentToken.allowance({
        owner: account,
        spender: spender,
        providerOrSigner: provider,
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
        providerOrSigner: provider,
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
      setApprovalStr(buttonText);
      let _completedActions = 0;
      await asyncEvery(approvals, async (f: () => Promise<boolean>) => {
        const success = await f();
        setCompletedActions(++_completedActions);
        return success;
      });
    } else {
      setTotalActions(1);
      setCompletedActions(0);

      await performAction();
      setTotalActions(0);
    }
  }, [approvals, completedActions, buttonText]);

  return (
    <Button
      variant="primary"
      className="w-100"
      onClick={() => submit()}
      disabled={isDisabled || totalActions > completedActions || !isReady}
    >
      {totalActions > completedActions ? (
        <>
          {spinner} {`${completedActions}/${totalActions}`}
        </>
      ) : (
        approvalStr
      )}
    </Button>
  );
}

export default ApproveOrPerformButton;
