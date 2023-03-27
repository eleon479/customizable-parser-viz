import { CastingContext, parse } from 'csv-parse';
import fs from 'fs';
import { Observable, toArray } from 'rxjs';
import {
  Account,
  AccountHistoryItem,
  FileRow,
  TransactionType,
} from './AccountHistory';

export class AccountHistoryService {
  private filePath: string;
  private headers: string[];
  private delimiter: string;
  private accountHistory: AccountHistoryItem[];
  private accountSummary: Account;
  private loaded: boolean;

  constructor(config: {
    filePath: string;
    headers: string[];
    delimiter: string;
  }) {
    this.filePath = config.filePath;
    this.headers = config.headers;
    this.delimiter = config.delimiter;
    this.accountHistory = [] as AccountHistoryItem[];
    this.accountSummary = {} as Account;
    this.loaded = false;
  }

  async getAccountSummary() {
    if (!this.loaded) {
      await this.loadAccount();
    }

    return this.accountSummary;
  }

  async loadAccount(): Promise<Account> {
    if (this.loaded) {
      return this.accountSummary;
    }

    const fileData = await this.getFileData(
      this.filePath,
      this.headers,
      this.delimiter
    );

    this.accountSummary = this.createAccountSummary(fileData);
    this.accountHistory = this.accountSummary.History;
    this.loaded = true;

    return this.accountSummary;
  }

  async getFileData(filePath: string, headers: string[], delimiter: string) {
    const fileRows: FileRow[] = [];
    const source: Observable<FileRow> = this.createFileParserObservable(
      filePath,
      headers,
      delimiter
    );

    return await source
      .pipe(toArray())
      .forEach((data) => {
        fileRows.push(...data);
      })
      .then(() => {
        return fileRows;
      });
  }

  createFileParserObservable(
    filePath: string,
    headers: string[],
    delimiter: string
  ): Observable<FileRow> {
    return new Observable<FileRow>((subscriber) => {
      const parser = fs.createReadStream(filePath).pipe(
        parse({
          delimiter: delimiter,
          columns: headers,
          fromLine: 2,
          cast: castParserTypes,
        })
      );
      parser.on('data', (dataRow: FileRow) => {
        subscriber.next(dataRow);
      });
      parser.on('end', () => {
        subscriber.complete();
      });
      parser.on('error', () => {
        subscriber.error();
      });
    });
  }

  createAccountSummary(rawRows: FileRow[]): Account {
    let accountSummary: Account = {
      History: [],
      TotalInterest: 0,
      TotalPrincipal: 0,
      TotalFees: 0,
      Balance: 0,
    };

    const historyItems = this.getHistoryItems(rawRows);
    const mostRecent = historyItems[historyItems.length - 1];

    if (mostRecent) {
      accountSummary = {
        History: historyItems,
        TotalInterest: mostRecent.InterestPaid,
        TotalPrincipal: mostRecent.PrincipalPaid,
        TotalFees: mostRecent.FeesPaid,
        Balance: mostRecent.ResultingBalance,
      };
    }

    return accountSummary;
  }

  getHistoryItems(fileRows: FileRow[]): AccountHistoryItem[] {
    let balance = 0;
    let principalPaid = 0;
    let interestPaid = 0;
    let feesPaid = 0;

    return fileRows.map((row) => {
      switch (row.Type) {
        case TransactionType.DISBURSEMENT:
          balance = row.Amount;
          break;
        case TransactionType.ACCRUED_INTEREST:
          balance += row.Amount;
          break;
        case TransactionType.PAYMENT:
          balance += row.Amount;
          principalPaid += -1 * row.Principal;
          interestPaid += -1 * row.Interest;
          feesPaid += -1 * row.Fees;
          break;
        case TransactionType.AUTO_DEBIT_PAYMENT:
          balance += row.Amount;
          principalPaid += -1 * row.Principal;
          interestPaid += -1 * row.Interest;
          feesPaid += -1 * row.Fees;
          break;
        case TransactionType.PAYMENT_REVERSAL:
          balance += row.Amount;
          principalPaid -= row.Principal;
          interestPaid -= row.Interest;
          feesPaid -= row.Fees;
          break;
        case TransactionType.RETURNED_CHARGE:
          balance += row.Amount;
          break;
        case TransactionType.CAPITALIZED_INTEREST:
          break;
        case TransactionType.ADJUSTMENT:
          break;
        default:
          break;
      }

      return {
        ...row,
        Transaction: row,
        ResultingBalance: balance,
        PrincipalPaid: principalPaid,
        InterestPaid: interestPaid,
        FeesPaid: feesPaid,
      };
    });
  }
}

function castParserTypes(columnValue: string, context: CastingContext) {
  try {
    const columnTypes: any = {
      Amount: Number,
      Fees: Number,
      Principal: Number,
      Interest: Number,
      Date: (v: string) => new Date(v),
      Type: (v: string) => getTransactionType(v),
    };

    let columnCastFn = columnTypes[context.column];
    let returnVal = columnCastFn ? columnCastFn(columnValue) : columnValue;

    return returnVal;
  } catch (error) {
    console.error('castParserTypes(): ', error);
  }
}

function getTransactionType(rawType: string): TransactionType {
  try {
    const typeIndex = Object.values(TransactionType).findIndex(
      (t) => t === rawType
    );
    return Object.values(TransactionType)[typeIndex];
  } catch (error) {
    console.error('getTransactionType(): ', error);
  }
}
