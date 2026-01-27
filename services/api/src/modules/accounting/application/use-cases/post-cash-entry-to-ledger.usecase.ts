import { Injectable, Logger } from "@nestjs/common";
import { CreateJournalEntryUseCase } from "./create-journal-entry.usecase";
import { PostJournalEntryUseCase } from "./post-journal-entry.usecase";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";

export interface CashEntryPostedPayload {
  entryId: string;
  registerId: string;
  amountCents: number;
  type: "IN" | "OUT";
  sourceType: string;
  businessDate?: string;
}

@RequireTenant()
@Injectable()
export class PostCashEntryToLedgerUseCase extends BaseUseCase<CashEntryPostedPayload, void> {
  private readonly _logger = new Logger(PostCashEntryToLedgerUseCase.name);

  constructor(
    private readonly createJournalEntryUC: CreateJournalEntryUseCase,
    private readonly postJournalEntryUC: PostJournalEntryUseCase
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    payload: CashEntryPostedPayload,
    ctx: UseCaseContext
  ): Promise<Result<void, UseCaseError>> {
    const { entryId, type, sourceType, amountCents } = payload;

    // 1. Determine Accounts
    const CASH_ACCOUNT_CODE = "1000"; // Cash on Hand
    const SALES_REVENUE_CODE = "4000"; // Sales Revenue
    const GENERAL_EXPENSE_CODE = "6000"; // General Expense
    const SUSPENSE_CODE = "9999"; // Suspense/Clearing

    let debitAccount: string;
    let creditAccount: string;

    if (type === "IN") {
      debitAccount = CASH_ACCOUNT_CODE;
      if (sourceType === "SALES" || sourceType === "SALE") {
        creditAccount = SALES_REVENUE_CODE;
      } else {
        creditAccount = SUSPENSE_CODE;
      }
    } else {
      creditAccount = CASH_ACCOUNT_CODE;
      if (sourceType === "EXPENSE") {
        debitAccount = GENERAL_EXPENSE_CODE;
      } else {
        debitAccount = SUSPENSE_CODE;
      }
    }

    this._logger.log(
      `[Mock] Creating Journal Entry for Cash Entry ${entryId}: Dr ${debitAccount}, Cr ${creditAccount} ${amountCents}`
    );

    return ok(undefined);
  }
}
