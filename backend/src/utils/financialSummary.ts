interface Transaction {
  amount: number | string;
  status: string;
  fromAccountId: string | null;
  toAccountId: string | null;
}

export function calculateFinancialSummary(
  transactions: Transaction[],
  accountId: string,
  currentBalance: number
) {
  const completedTransactions = transactions.filter(
    (transaction) => transaction.status === "COMPLETED"
  );

  const totalIncome = completedTransactions
    .filter((transaction) => transaction.toAccountId === accountId)
    .reduce(
      (total, transaction) => total + Number(transaction.amount),
      0
    );

  const totalExpenses = completedTransactions
    .filter((transaction) => transaction.fromAccountId === accountId)
    .reduce(
      (total, transaction) => total + Number(transaction.amount),
      0
    );

  return {
    totalIncome,
    totalExpenses,
    currentBalance,
  };
}