export function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function serializeWallet(wallet: any) {
  return {
    ...wallet,
    balance: decimalToNumber(wallet.balance),
    openingBalance: decimalToNumber(wallet.openingBalance),
  };
}

export function serializeTransaction(transaction: any) {
  return {
    ...transaction,
    amount: decimalToNumber(transaction.amount),
    wallet: transaction.wallet ? serializeWallet(transaction.wallet) : undefined,
    toWallet: transaction.toWallet ? serializeWallet(transaction.toWallet) : undefined,
  };
}
