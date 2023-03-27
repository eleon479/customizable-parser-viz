enum TransactionType {
  DISBURSEMENT = 'Disbursement',
  ACCRUED_INTEREST = 'Accrued Interest',
  PAYMENT = 'Payment',
  AUTO_DEBIT_PAYMENT = 'Auto debit payment',
  PAYMENT_REVERSAL = 'Payment reversal',
  RETURNED_CHARGE = 'Returned check charge',
  CAPITALIZED_INTEREST = 'Capitalized Interest',
  ADJUSTMENT = 'Adjustment',
}

type FileRow = {
  Date: string;
  Type: TransactionType;
  Amount: number;
  Fees: number;
  Principal: number;
  Interest: number;
};

type AccountHistoryItem = {
  Transaction: FileRow;

  // running totals
  InterestPaid: number;
  PrincipalPaid: number;
  FeesPaid: number;
  ResultingBalance: number;

  // info from filerow
  Date: string;
  Type: TransactionType;
  Amount: number;
  Fees: number;
  Principal: number;
  Interest: number;
};

type Account = {
  Balance: number;
  TotalInterest: number;
  TotalPrincipal: number;
  TotalFees: number;
  History: AccountHistoryItem[];
};

export { Account, AccountHistoryItem, FileRow, TransactionType };
