import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { ClockPort } from "../ports/clock.port";
import type { ClassesSettingsRepositoryPort } from "../ports/classes-settings-repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import { aggregateBillingPreview } from "../../domain/rules/billing.rules";
import { getMonthRangeUtc } from "../helpers/billing-period";
import { normalizeBillingSettings, DEFAULT_PREPAID_SETTINGS } from "../helpers/billing-settings";
import type { BillingPreviewItem } from "../../domain/entities/classes.entities";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isValidSnapshotLine = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.classGroupId === "string" &&
    typeof value.sessions === "number" &&
    typeof value.priceCents === "number" &&
    typeof value.amountCents === "number"
  );
};

const isValidSnapshotItem = (value: unknown): value is BillingPreviewItem => {
  if (!isRecord(value) || !Array.isArray(value.lines)) {
    return false;
  }
  return (
    typeof value.payerClientId === "string" &&
    typeof value.totalSessions === "number" &&
    typeof value.totalAmountCents === "number" &&
    typeof value.currency === "string" &&
    value.lines.every(isValidSnapshotLine)
  );
};

const readSnapshotItems = (
  billingSnapshot: Record<string, unknown> | null
): BillingPreviewItem[] => {
  if (!billingSnapshot || !Array.isArray(billingSnapshot.items)) {
    return [];
  }
  return billingSnapshot.items.filter(isValidSnapshotItem);
};

const readSnapshotSentInvoiceIds = (billingSnapshot: Record<string, unknown> | null): string[] => {
  if (!billingSnapshot || !Array.isArray(billingSnapshot.sentInvoiceIds)) {
    return [];
  }
  return Array.from(
    new Set(
      billingSnapshot.sentInvoiceIds.filter(
        (invoiceId): invoiceId is string => typeof invoiceId === "string" && invoiceId.length > 0
      )
    )
  );
};

@RequireTenant()
export class GetMonthlyBillingPreviewUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly settingsRepo: ClassesSettingsRepositoryPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: { month: string; classGroupId?: string; payerClientId?: string },
    ctx: UseCaseContext
  ) {
    assertCanClasses(ctx, "classes.billing");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const { startUtc, endUtc, month } = getMonthRangeUtc(input.month);

    const settings = normalizeBillingSettings(
      (await this.settingsRepo.getSettings(tenantId, workspaceId)) ?? DEFAULT_PREPAID_SETTINGS
    );

    const rows =
      settings.billingBasis === "SCHEDULED_SESSIONS"
        ? await this.repo.listBillableScheduledForMonth(tenantId, workspaceId, {
            monthStart: startUtc,
            monthEnd: endUtc,
            classGroupId: input.classGroupId,
            payerClientId: input.payerClientId,
          })
        : await this.repo.listBillableAttendanceForMonth(tenantId, workspaceId, {
            monthStart: startUtc,
            monthEnd: endUtc,
            classGroupId: input.classGroupId,
            payerClientId: input.payerClientId,
          });

    const items = aggregateBillingPreview(rows);
    const existingRun = await this.repo.findBillingRunByMonth(tenantId, workspaceId, month);
    const invoiceLinks = existingRun
      ? await this.repo.listBillingInvoiceLinks(tenantId, workspaceId, existingRun.id)
      : [];
    const hasFilter = Boolean(input.classGroupId || input.payerClientId);
    const filteredLineKeys = new Set(
      items.flatMap((item) =>
        item.lines.map((line) => `${item.payerClientId}:${line.classGroupId}`)
      )
    );
    const filteredInvoiceLinks = hasFilter
      ? invoiceLinks.filter((link) => {
          if (input.classGroupId) {
            return link.classGroupId === input.classGroupId;
          }
          if (link.classGroupId) {
            return filteredLineKeys.has(`${link.payerClientId}:${link.classGroupId}`);
          }
          return items.some(
            (item) => item.payerClientId === link.payerClientId && item.lines.length === 1
          );
        })
      : invoiceLinks;
    const invoiceStatusesById = this.repo.getInvoiceStatusesByIds
      ? await this.repo.getInvoiceStatusesByIds(
          workspaceId,
          filteredInvoiceLinks.map((link) => link.invoiceId)
        )
      : {};

    const billingSnapshot =
      typeof existingRun?.billingSnapshot === "object" && existingRun.billingSnapshot
        ? (existingRun.billingSnapshot as Record<string, unknown>)
        : null;

    const invoicesSentAt =
      billingSnapshot && typeof billingSnapshot.sentAt === "string" ? billingSnapshot.sentAt : null;
    const sentInvoiceCount =
      billingSnapshot && typeof billingSnapshot.sentInvoiceCount === "number"
        ? billingSnapshot.sentInvoiceCount
        : null;
    const sentInvoiceIds = readSnapshotSentInvoiceIds(billingSnapshot);
    const invoiceIdsForProgress = sentInvoiceIds.length
      ? sentInvoiceIds
      : filteredInvoiceLinks.map((link) => link.invoiceId);

    let invoiceSendProgress: Awaited<
      ReturnType<NonNullable<typeof this.repo.getBillingInvoiceSendProgress>>
    > | null = null;
    if (this.repo.getBillingInvoiceSendProgress && invoicesSentAt) {
      const sentAfter = new Date(invoicesSentAt);
      if (!Number.isNaN(sentAfter.valueOf())) {
        const expectedInvoiceCount =
          sentInvoiceIds.length > 0
            ? sentInvoiceIds.length
            : sentInvoiceCount !== null
              ? sentInvoiceCount
              : filteredInvoiceLinks.length;
        invoiceSendProgress = await this.repo.getBillingInvoiceSendProgress(
          workspaceId,
          invoiceIdsForProgress,
          sentAfter,
          expectedInvoiceCount
        );
      }
    }

    const snapshotItems = readSnapshotItems(billingSnapshot);
    const effectiveItems = hasFilter || items.length > 0 ? items : snapshotItems;

    return {
      month,
      billingMonthStrategy: settings.billingMonthStrategy,
      billingBasis: settings.billingBasis,
      billingRunStatus: existingRun?.status ?? null,
      items: effectiveItems,
      invoiceLinks: filteredInvoiceLinks.map((link) => ({
        payerClientId: link.payerClientId,
        classGroupId: link.classGroupId ?? null,
        invoiceId: link.invoiceId,
        invoiceStatus: invoiceStatusesById[link.invoiceId] ?? null,
      })),
      invoicesSentAt,
      invoiceSendProgress,
      generatedAt: this.clock.now(),
    };
  }
}
