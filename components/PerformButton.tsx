import * as React from "react";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";

export type PerformButtonProps = {
  isDisabled: boolean;
  isAllowed: boolean;
  isActing: boolean;
  performAction: () => Promise<string | void>;
  buttonText: string;
};

export function PerformButton(props: PerformButtonProps) {
  const { isDisabled, isAllowed, isActing, performAction, buttonText } = props;

  const submit = React.useCallback(async () => {
    await performAction();
  }, [performAction]);

  const spinner = (
    <Spinner as="span" size="sm" animation="border" role="status">
      <span className="visually-hidden">Sending Transaction...</span>
    </Spinner>
  );

  return (
    <Button
      variant={
        !isAllowed
          ? "info"
          : buttonText === "Reject Bid"
          ? "danger"
          : "success"
      }
      className="w-100"
      onClick={() => submit()}
      disabled={isDisabled || !isAllowed}
    >
      {isActing ? spinner : buttonText}
    </Button>
  );
}

export default PerformButton;
