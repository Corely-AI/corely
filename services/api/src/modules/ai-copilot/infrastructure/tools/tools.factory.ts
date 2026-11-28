import { HttpException, Logger } from "@nestjs/common";
import type { OperationalTaskCompletion } from "@corely/contracts";
import { tool, type Tool } from "ai";
import { SpanStatusCode } from "@opentelemetry/api";
import type {
  DomainToolPort,
  LocalizedToolText,
  ToolLocale,
} from "../../application/ports/domain-tool.port";
import type { ToolExecutionRepositoryPort } from "../../application/ports/tool-execution-repository.port";
import type { AuditPort } from "../../application/ports/audit.port";
import type { OutboxPort } from "@corely/kernel";
import { type ObservabilityPort, type ObservabilitySpanRef, type JsonValue } from "@corely/kernel";
import { isToolInActiveAppScope } from "./app-scope";
import { matchesOperationalApproval } from "../../application/policies/operational-approvals";

const logger = new Logger("ToolsFactory");
const REDACTED = { redacted: true };
const MAX_OPERATIONAL_CALLS = 8;

export function buildAiTools(
  tools: DomainToolPort[],
  deps: {
    authorize: (tool: DomainToolPort) => Promise<void>;
    toolExecutions: ToolExecutionRepositoryPort;
    audit: AuditPort;
    outbox: OutboxPort;
    locale?: string;
    tenantId: string;
    runTenantId?: string;
    workspaceId?: string;
    explicitWorkspace?: boolean;
    operationalApprovals?: ReadonlyMap<string, OperationalTaskCompletion>;
    activeAppId?: string;
    runId: string;
    userId: string;
    latestUserMessage?: string;
    observability: ObservabilityPort;
    parentSpan: ObservabilitySpanRef;
  }
): Record<string, Tool<unknown, unknown>> {
  const serverTools = tools.filter(
    (
      candidate
    ): candidate is DomainToolPort & { execute: NonNullable<DomainToolPort["execute"]> } =>
      candidate.kind === "server" && typeof candidate.execute === "function"
  );
  let operationalCalls = 0;

  const entries = serverTools.map<[string, Tool<any, any>]>((t) => [
    t.name,
    (tool as any)({
      description: resolveToolDescription(t.description, t.descriptions, deps.locale),
      parameters: t.inputSchema,
      ...(t.operational ? { inputSchema: t.inputSchema, needsApproval: t.needsApproval } : {}),
      execute: async (input: any, options: { toolCallId: string; messages?: any[] }) => {
        const { toolCallId } = options;
        const approved = matchesOperationalApproval(
          deps.operationalApprovals?.get(toolCallId),
          input
        );
        if (
          t.operational &&
          (!deps.explicitWorkspace || operationalCalls++ >= MAX_OPERATIONAL_CALLS)
        ) {
          throw new Error("Operational tool scope or call limit exceeded");
        }
        if (t.operational && t.needsApproval && !approved) {
          throw new Error("Approval for this exact proposal is required");
        }

        const runTenantId = t.operational ? (deps.runTenantId ?? deps.tenantId) : deps.tenantId;
        await deps.toolExecutions.create({
          id: `${deps.runId}:${toolCallId}`,
          tenantId: runTenantId,
          runId: deps.runId,
          toolCallId,
          toolName: t.name,
          inputJson: JSON.stringify(t.operational ? REDACTED : input),
          status: "pending",
          traceId: deps.parentSpan.traceId,
        });
        const span = deps.observability.startSpan(
          `tool.${t.name}`,
          {
            "tool.name": t.name,
            "tool.call_id": toolCallId,
            "copilot.run.id": deps.runId,
          },
          deps.parentSpan
        );
        const startedAt = Date.now();
        try {
          if (!isToolInActiveAppScope(t.appId, deps.activeAppId)) {
            throw new Error(
              `Platform:ToolNotInAppScope (expected ${deps.activeAppId}, got ${t.appId})`
            );
          }

          await deps.authorize(t);
          const result = await t.execute({
            tenantId: deps.tenantId,
            workspaceId: deps.workspaceId,
            userId: deps.userId,
            input,
            toolCallId,
            runId: deps.runId,
            messages: options.messages,
            latestUserMessage: deps.latestUserMessage,
            ...(t.operational ? { explicitWorkspace: deps.explicitWorkspace, approved } : {}),
          });
          await deps.toolExecutions.complete(runTenantId, deps.runId, toolCallId, {
            status: "completed",
            outputJson: JSON.stringify(t.operational ? REDACTED : result),
          });
          await deps.audit.write({
            tenantId: deps.tenantId,
            actorUserId: deps.userId,
            action: `copilot.tool.${t.name}`,
            targetType: "ToolExecution",
            targetId: toolCallId,
            details: JSON.stringify({ runId: deps.runId }),
          });
          await deps.outbox.enqueue({
            tenantId: deps.tenantId,
            eventType: "copilot.tool.completed",
            payload: { runId: deps.runId, tool: t.name },
          });
          const durationMs = Date.now() - startedAt;
          deps.observability.recordToolObservation(span, {
            toolName: t.name,
            toolCallId,
            input: t.operational ? REDACTED : (input as JsonValue),
            output: t.operational ? REDACTED : (result as JsonValue),
            status: "ok",
            durationMs,
          });
          deps.observability.endSpan(span);
          return result;
        } catch (error) {
          const errorMessage = t.operational
            ? operationalFailure(error)
            : error instanceof Error
              ? error.message
              : String(error);
          const errorStack = !t.operational && error instanceof Error ? error.stack : undefined;
          logger.error(
            `[tool:${t.name}] runId=${deps.runId} toolCallId=${toolCallId} FAILED: ${errorMessage}`,
            errorStack
          );
          await deps.toolExecutions.complete(runTenantId, deps.runId, toolCallId, {
            status: "failed",
            errorJson: errorMessage,
          });
          const durationMs = Date.now() - startedAt;
          deps.observability.recordToolObservation(span, {
            toolName: t.name,
            toolCallId,
            input: t.operational ? REDACTED : (input as JsonValue),
            status: "error",
            durationMs,
            errorType: "tool",
            errorMessage,
          });
          deps.observability.endSpan(span, { code: SpanStatusCode.ERROR, message: "tool_failed" });
          throw t.operational ? new Error(errorMessage) : error;
        }
      },
    }),
  ]);

  return Object.fromEntries(entries) as any;
}

function operationalFailure(error: unknown) {
  if (error instanceof HttpException && error.getStatus() === 409) {
    return "Task or proposal changed. Review the current task and create a new proposal.";
  }
  return "Operational tool access or execution failed.";
}

export const resolveToolLocale = (locale?: string): ToolLocale => {
  const normalized = locale?.trim().toLowerCase();

  if (normalized?.startsWith("de")) {
    return "de";
  }
  if (normalized?.startsWith("vi")) {
    return "vi";
  }

  return "en";
};

export const resolveToolDescription = (
  fallbackDescription: string,
  descriptions?: LocalizedToolText,
  locale?: string
): string => {
  if (!descriptions) {
    return fallbackDescription;
  }

  const resolvedLocale = resolveToolLocale(locale);
  return (
    descriptions[resolvedLocale] ??
    descriptions.en ??
    descriptions.de ??
    descriptions.vi ??
    fallbackDescription
  );
};
