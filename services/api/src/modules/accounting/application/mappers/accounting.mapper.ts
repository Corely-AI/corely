import { type LedgerAccountAggregate } from "../../domain/ledger-account.aggregate";
import { type JournalEntryAggregate } from "../../domain/journal-entry.aggregate";
import { type LedgerAccountRepoPort } from "../ports/accounting-repository.port";

export function mapSettingsToDto(settings: any) {
  const props = settings.toProps();
  return {
    id: settings.id,
    tenantId: settings.tenantId,
    baseCurrency: settings.baseCurrency,
    fiscalYearStartMonthDay: settings.fiscalYearStartMonthDay,
    periodLockingEnabled: settings.periodLockingEnabled,
    entryNumberPrefix: settings.entryNumberPrefix,
    nextEntryNumber: settings.nextEntryNumber,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function mapPeriodToDto(period: any) {
  const props = period.toProps();
  return {
    id: period.id,
    tenantId: period.tenantId,
    fiscalYearId: period.fiscalYearId,
    name: period.name,
    startDate: period.startDate,
    endDate: period.endDate,
    status: period.status,
    closedAt: props.closedAt?.toISOString() || null,
    closedBy: period.closedBy || null,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function mapAccountToDto(account: LedgerAccountAggregate) {
  const props = account.toProps();
  return {
    id: account.id,
    tenantId: account.tenantId,
    code: account.code,
    name: account.name,
    type: account.type,
    isActive: account.isActive,
    description: account.description || null,
    systemAccountKey: account.systemAccountKey || null,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export async function mapEntryToDto(
  entry: JournalEntryAggregate,
  accountRepo: LedgerAccountRepoPort,
  tenantId: string
) {
  const props = entry.toProps();

  // Enrich lines with account details
  const lines = await Promise.all(
    props.lines.map(async (line) => {
      const account = await accountRepo.findById(tenantId, line.ledgerAccountId);
      return {
        id: line.id,
        ledgerAccountId: line.ledgerAccountId,
        ledgerAccountCode: account?.code,
        ledgerAccountName: account?.name,
        direction: line.direction,
        amountCents: line.amountCents,
        currency: line.currency,
        lineMemo: line.lineMemo || null,
        reference: line.reference || null,
        tags: line.tags || null,
      };
    })
  );

  return {
    id: entry.id,
    tenantId: entry.tenantId,
    entryNumber: entry.entryNumber || null,
    status: entry.status,
    postingDate: entry.postingDate,
    memo: entry.memo,
    sourceType: entry.sourceType || null,
    sourceId: entry.sourceId || null,
    sourceRef: props.sourceRef || null,
    lines,
    reversesEntryId: entry.reversesEntryId || null,
    reversedByEntryId: entry.reversedByEntryId || null,
    createdBy: entry.createdBy,
    createdAt: props.createdAt.toISOString(),
    postedBy: entry.postedBy || null,
    postedAt: props.postedAt?.toISOString() || null,
    updatedAt: props.updatedAt.toISOString(),
  };
}
