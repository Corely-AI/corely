import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { ClockPort } from "../ports/clock.port";
import type { ClassesSettingsRepositoryPort } from "../ports/classes-settings-repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import { aggregateBillingPreview } from "../../domain/rules/billing.rules";
import { getMonthRangeUtc } from "../helpers/billing-period";
import { normalizeBillingSettings, DEFAULT_PREPAID_SETTINGS } from "../helpers/billing-settings";

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

    const invoicesSentAt =
      typeof existingRun?.billingSnapshot === "object" &&
      existingRun?.billingSnapshot &&
      "sentAt" in existingRun.billingSnapshot
        ? ((existingRun.billingSnapshot as { sentAt?: string }).sentAt ?? null)
        : null;

    return {
      month,
      billingMonthStrategy: settings.billingMonthStrategy,
      billingBasis: settings.billingBasis,
      billingRunStatus: existingRun?.status ?? null,
      items,
      invoiceLinks: invoiceLinks.map((link) => ({
        payerClientId: link.payerClientId,
        invoiceId: link.invoiceId,
      })),
      invoicesSentAt,
      generatedAt: this.clock.now(),
    };
  }
}
