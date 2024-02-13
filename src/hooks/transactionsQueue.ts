import { useState } from "react";

export default function useTransactionsQueue() {
  const [transactionError, setTransactionError] = useState("");
  const [areTransactionsLoading, setAreTransactionsLoading] = useState(false);
  const [completedTransactions, setCompletedTransactions] = useState(0);

  const executeTransactions = async (transactions: (() => Promise<void>)[]) => {
    setAreTransactionsLoading(true);
    setTransactionError("");

    try {
      for (const transaction of transactions) {
        await transaction();

        setCompletedTransactions((prev) => prev + 1);
      }

      setAreTransactionsLoading(false);
      setCompletedTransactions(0);
    } catch (err: any) {
      let errorMessage = "An error occured executing the transaction";

      if (err.code === "ACTION_REJECTED") {
        errorMessage = "Transaction rejected";
      }

      setTransactionError(errorMessage);
      setCompletedTransactions(0);
      setAreTransactionsLoading(false);

      throw Error(err);
    }
  };

  return {
    areTransactionsLoading,
    completedTransactions,
    transactionError,
    executeTransactions,
  };
}
