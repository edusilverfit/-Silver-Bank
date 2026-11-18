export function validateDeposit(amount: number): boolean {
  if (!Number.isFinite(amount)) {
    return false;
  }

  return amount > 0;
}