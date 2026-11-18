export function validatePix(
  amount: number,
  balance: number,
  senderAccountId: string,
  recipientAccountId: string
): boolean {
  if (
    !Number.isFinite(amount) ||
    !Number.isFinite(balance)
  ) {
    return false;
  }

  if (amount <= 0 || balance < 0) {
    return false;
  }

  if (amount > balance) {
    return false;
  }

  if (senderAccountId === recipientAccountId) {
    return false;
  }

  return true;
}