import * as React from "react";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";

export type ApproveOrPerformButtonProps = {
  isDisabled: boolean;
  actionsDone: number;
  actionsTotal: number;
  performAction: () => Promise<string | void>;
  buttonText: string;
};

export function ApproveOrPerformButton(props: ApproveOrPerformButtonProps) {
  const { isDisabled, performAction, buttonText, actionsTotal, actionsDone } =
    props;

  const spinner = (
    <Spinner as="span" size="sm" animation="border" role="status">
      <span className="visually-hidden">Sending Transaction...</span>
    </Spinner>
  );

  return (
    <Button
      variant="primary"
      className="w-100"
      onClick={() => performAction()}
      disabled={isDisabled}
    >
      {actionsTotal > actionsDone ? (
        <>
          {spinner} {`${actionsDone}/${actionsTotal}`}
        </>
      ) : (
        buttonText
      )}
    </Button>
  );
}

export default ApproveOrPerformButton;
