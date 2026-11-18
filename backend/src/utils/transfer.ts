export function validateTransfer(amount: number, balance: number): boolean {
  if (!Number.isFinite(amount) || !Number.isFinite(balance)) {
    return false;
  }

  if (amount <= 0 || balance < 0) {
    return false;
  }

  return amount <= balance;
}