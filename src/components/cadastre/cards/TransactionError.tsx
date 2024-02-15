import { MouseEventHandler } from "react";
import Alert from "react-bootstrap/Alert";

export type TransactionErrorProps = {
  message?: string;
  onClick?: MouseEventHandler | undefined;
};

function TransactionError(props: TransactionErrorProps) {
  return (
    <Alert variant="danger" dismissible onClick={props.onClick}>
      <Alert.Heading style={{ fontSize: "1em" }}>
        Transaction Failed
      </Alert.Heading>
      <p style={{ fontSize: "0.8em" }}>{`Something went wrong: ${
        props.message
          ? props.message.replace(/([^.])$/, "$1.")
          : "unknown reason."
      }`}</p>
    </Alert>
  );
}

export default TransactionError;
