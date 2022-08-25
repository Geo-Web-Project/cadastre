import * as React from "react";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { BigNumber, constants } from "ethers";
import { SidebarProps } from "./Sidebar";
import { PAYMENT_TOKEN } from "../lib/constants";
import { ActionData } from "./cards/ActionForm";

export type ApproveOrPerformButtonProps = SidebarProps & {
  isDisabled: boolean;
  performAction: () => Promise<string | void>;
  buttonText: string;
  requiredPayment?: BigNumber;
  requiredFlowAmount?: BigNumber;
  spender: string;
  setActionData: React.Dispatch<React.SetStateAction<ActionData>>;
};

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
    setActionData,
  } = props;

  const [approvals, setApprovals] = React.useState<(() => Promise<boolean>)[]>(
    []
  );
  const [approvalStr, setApprovalStr] = React.useState<string>(buttonText);
  const [completedActions, setCompletedActions] = React.useState<number>(0);
  const [totalActions, setTotalActions] = React.useState<number>(0);

  const spinner = (
    <Spinner as="span" size="sm" animation="border" role="status">
      <span className="visually-hidden">Sending Transaction...</span>
    </Spinner>
  );

  function updateActionData(updatedValues: ActionData) {
    function _updateData(updatedValues: ActionData) {
      return (prevState: ActionData) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setActionData(_updateData(updatedValues));
  }

  const approvePayment = async () => {
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
      const _approvals = [];
      let _approvalStr = buttonText;

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

      setApprovals(_approvals);
      setApprovalStr(_approvalStr);
    };

    checkRequirements();
  }, [paymentToken, account, spender, provider, requiredPayment]);

  const submit = async () => {
    if (approvals.length > 0) {
      setTotalActions(approvals.length);
      await asyncEvery(approvals, async (f: () => Promise<boolean>) => {
        const success = await f();
        setCompletedActions(completedActions + 1);
        return success;
      });
    }

    {
      /* if (success) {
      setTotalActions(1);
      setCompletedActions(0);

      await performAction();
      setTotalActions(0);
    } */
    }
  };

  return (
    <Button
      variant="primary"
      className="w-100"
      onClick={() => submit()}
      disabled={isDisabled}
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
