import * as React from "react";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import Image from "react-bootstrap/Image";
import { OffCanvasPanelProps } from "../../OffCanvasPanel";
import { useMUD } from "../../../lib/MUDContext";
import { concatHex, stringToHex } from "viem";
import { resourceTypeIds } from "@latticexyz/common";
import { AugmentType } from "../AugmentPublisher";
import { getAugmentAddress } from "../AugmentPublisher";

export type ApproveAugmentButtonProps = OffCanvasPanelProps & {
  isDisabled: boolean;
  setErrorMessage: (v: string) => void;
  isActing: boolean;
  setIsActing: (v: boolean) => void;
  setDidFail: (v: boolean) => void;
  isAllowed: boolean;
  setIsAllowed: React.Dispatch<React.SetStateAction<boolean>>;
  augmentType: AugmentType;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asyncEvery = async (arr: any, predicate: any) => {
  for (const e of arr) {
    if (!(await predicate(e))) return false;
  }
  return true;
};

export function ApproveAugmentButton(props: ApproveAugmentButtonProps) {
  const {
    isDisabled,
    worldContract,
    account,
    signer,
    setErrorMessage,
    isActing,
    setIsActing,
    setDidFail,
    isAllowed,
    setIsAllowed,
    selectedParcelId,
    augmentType,
  } = props;

  const [approvals, setApprovals] = React.useState<(() => Promise<boolean>)[]>(
    []
  );
  const [approvalStr, setApprovalStr] = React.useState<string>("");
  const [completedActions, setCompletedActions] = React.useState<number>(0);
  const [totalActions, setTotalActions] = React.useState<number>(0);

  const { tables, useStore } = useMUD();

  const namespaceId = React.useMemo(() => {
    const typeId = resourceTypeIds.namespace;
    return concatHex([
      stringToHex(typeId, { size: 2 }),
      stringToHex(Number(selectedParcelId).toString(), { size: 14 }),
      stringToHex("", { size: 16 }),
    ]);
  }, [selectedParcelId]);

  const namespaceOwner = useStore((state: any) =>
    state.getRecord(tables.NamespaceOwner, { namespaceId })
  );

  const namespaceAccess = useStore((state: any) =>
    state.getRecord(tables.ResourceAccess, {
      resourceId: namespaceId,
      caller: getAugmentAddress(augmentType),
    })
  );

  const spinner = (
    <Spinner as="span" size="sm" animation="border" role="status">
      <span className="visually-hidden">Sending Transaction...</span>
    </Spinner>
  );

  const claimNamespace = React.useCallback(async () => {
    if (!signer) {
      return false;
    }

    try {
      const txn = await worldContract
        .connect(signer)
        .claimParcelNamespace(Number(selectedParcelId));
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
  }, [worldContract, selectedParcelId]);

  const approveAugment = React.useCallback(async () => {
    if (!signer) {
      return false;
    }

    try {
      const txn = await worldContract
        .connect(signer)
        .functions.grantAccess(namespaceId, getAugmentAddress(augmentType));
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
  }, [worldContract, selectedParcelId]);

  React.useEffect(() => {
    const checkRequirements = async () => {
      const _approvals: (() => Promise<boolean>)[] = [];
      let _approvalStr = ``;

      // Check namespace claim
      if (
        namespaceOwner?.value?.owner.toLowerCase() !== account.toLowerCase()
      ) {
        _approvals.push(claimNamespace);
        _approvalStr = "Claim Permission";
      }

      // Check augment permissions
      if (!namespaceAccess || namespaceAccess?.value?.access === false) {
        _approvalStr =
          _approvals.length > 0
            ? `${_approvalStr} & Approve Augment`
            : "Approve Augment";
        _approvals.push(approveAugment);
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
  }, [account, signer, completedActions, namespaceOwner]);

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
      variant={isAllowed || isActing ? "info" : "primary"}
      className="w-100 mb-3"
      onClick={() => submit()}
      disabled={
        isDisabled || isAllowed || isActing || totalActions > completedActions
      }
    >
      {isAllowed || isActing ? (
        <>
          <span className="ms-4">Ready to Publish</span>
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

export default ApproveAugmentButton;
