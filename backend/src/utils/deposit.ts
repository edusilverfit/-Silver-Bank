export function validateDeposit(amount: number): boolean {
  if (!Number.isFinite(amount)) {
    return false;
  }

  if (amount <= 0 || amount > 100000) {
    return false;
  }

  return true;
}