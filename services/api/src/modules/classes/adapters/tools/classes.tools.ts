import {
  TeacherDashboardSummaryQuerySchema,
  TeacherDashboardUnpaidInvoicesQuerySchema,
} from "@corely/contracts/classes";
import { type DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { type GetTeacherDashboardSummaryUseCase } from "../../application/use-cases/get-teacher-dashboard-summary.use-case";
import { type GetTeacherDashboardUnpaidInvoicesUseCase } from "../../application/use-cases/get-teacher-dashboard-unpaid-invoices.use-case";

const validationError = (issues: unknown) => ({
  ok: false,
  code: "VALIDATION_ERROR",
  message: "Invalid input for tool call",
  details: issues,
});

const buildCtx = (tenantId: string, userId: string, toolCallId?: string, runId?: string) => ({
  tenantId,
  workspaceId: tenantId,
  userId,
  correlationId: toolCallId ?? runId,
  requestId: toolCallId,
});

export const buildClassesTools = (deps: {
  getSummary: GetTeacherDashboardSummaryUseCase;
  getUnpaidInvoices: GetTeacherDashboardUnpaidInvoicesUseCase;
}): DomainToolPort[] => [
  {
    name: "classes_getTeacherDashboardSummary",
    description:
      "Get teacher dashboard summary metrics for classes in a date range (sessions and attendance health).",
    kind: "server",
    inputSchema: TeacherDashboardSummaryQuerySchema,
    execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
      const parsed = TeacherDashboardSummaryQuerySchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      return deps.getSummary.execute(buildCtx(tenantId, userId, toolCallId, runId), parsed.data);
    },
  },
  {
    name: "classes_getTeacherDashboardUnpaidInvoices",
    description: "Get count of unpaid class-related invoices (optionally filtered by class group).",
    kind: "server",
    inputSchema: TeacherDashboardUnpaidInvoicesQuerySchema,
    execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
      const parsed = TeacherDashboardUnpaidInvoicesQuerySchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      return deps.getUnpaidInvoices.execute(
        buildCtx(tenantId, userId, toolCallId, runId),
        parsed.data
      );
    },
  },
];
