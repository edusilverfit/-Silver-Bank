export function validateTransfer(amount: number, balance: number): boolean {
  if (!Number.isFinite(amount) || !Number.isFinite(balance)) {
    return false;
  }

  if (amount <= 0 || amount > 50000 || balance < 0) {
    return false;
  }

  const scaledAmount = amount * 100;
  if (Math.abs(scaledAmount - Math.round(scaledAmount)) > 1e-8) {
    return false;
  }

  return amount <= balance;
}