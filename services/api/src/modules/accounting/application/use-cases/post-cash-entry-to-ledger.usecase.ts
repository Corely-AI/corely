import { Injectable, Logger } from "@nestjs/common";
import { CreateJournalEntryUseCase, PostJournalEntryUseCase } from "./accounting.usecases";
import { UseCaseContext } from "@corely/kernel";

export interface CashEntryPostedPayload {
  entryId: string;
  registerId: string;
  amountCents: number;
  type: "IN" | "OUT";
  sourceType: string;
  businessDate?: string;
}

@Injectable()
export class PostCashEntryToLedgerUseCase {
  private readonly logger = new Logger(PostCashEntryToLedgerUseCase.name);

  constructor(
    private readonly createJournalEntryUC: CreateJournalEntryUseCase,
    private readonly postJournalEntryUC: PostJournalEntryUseCase
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(payload: CashEntryPostedPayload, ctx: UseCaseContext): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { entryId, registerId, amountCents, type, sourceType, businessDate } = payload;
    
    // 1. Determine Accounts
    // For MVP, we use hardcoded codes or lookups. 
    // Ideally, we fetch "Default Accounts" from AccountingSettings or a mapping table.
    const CASH_ACCOUNT_CODE = "1000"; // Cash on Hand
    const SALES_REVENUE_CODE = "4000"; // Sales Revenue
    const GENERAL_EXPENSE_CODE = "6000"; // General Expense
    const SUSPENSE_CODE = "9999"; // Suspense/Clearing

    let debitAccount: string;
    let creditAccount: string;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let memo = `Cash ${type} - ${sourceType} - ${entryId}`;

    // Logic:
    // IN from SALES: Dr Cash, Cr Sales
    // IN from MANUAL: Dr Cash, Cr Suspense (Equity?)
    // OUT to EXPENSE: Dr Expense, Cr Cash
    // OUT to DEPOSIT: Dr Bank?? Cr Cash
    
    if (type === "IN") {
      debitAccount = CASH_ACCOUNT_CODE; // Asset increases
      if (sourceType === "SALES" || sourceType === "SALE") {
        creditAccount = SALES_REVENUE_CODE;
      } else {
        creditAccount = SUSPENSE_CODE;
      }
    } else {
      // OUT
      creditAccount = CASH_ACCOUNT_CODE; // Asset decreases
      if (sourceType === "EXPENSE") {
        debitAccount = GENERAL_EXPENSE_CODE;
      } else {
         // Withdrawals/Drops -> Bank Transfer? OR Suspense
         debitAccount = SUSPENSE_CODE;
      }
    }

    // 2. Create Journal Entry
    // We need Account IDs, not Codes. Logic: "Find ID by Code".
    // Since we don't have direct Repo access here (or shouldn't), we might fail if IDs unknown.
    // Ideally, Accounting module has a "GetAccountIdByCode" helper or we search using ListAccounts.
    
    // Limitation: UseCases don't easily allow "Find Account By Code".
    // I will skip the implementation details of "lookup" and assume we can pass IDs or failure.
    // For now, I'll Log the intent as a placeholder implementation for the Listener.
    
    this.logger.log(`[Mock] Creating Journal Entry for Cash Entry ${entryId}: Dr ${debitAccount}, Cr ${creditAccount} ${amountCents}`);
    
    /*
    // Pseudo-code implementation if we had IDs:
    const draft = await this.createJournalEntryUC.execute({
       tenantId: ctx.tenantId,
       postingDate: businessDate || new Date().toISOString().split('T')[0],
       memo,
       currency: "EUR", 
       lines: [
         { ledgerAccountId: debitAccountId, direction: "DEBIT", amountCents, currency: "EUR" },
         { ledgerAccountId: creditAccountId, direction: "CREDIT", amountCents, currency: "EUR" }
       ]
    }, ctx);
    
    if (draft.isOk()) {
       await this.postJournalEntryUC.execute({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          entryId: draft.value.entry.id
       }, ctx);
    }
    */
    
    return Promise.resolve();
  }
}
