import React from "react";
import { type CollectInputsToolInput, type CollectInputsToolOutput } from "@corely/contracts";
import { Card, CardContent, Button } from "@corely/ui";
import i18n from "@/shared/i18n";
import { QuestionForm } from "@/shared/components/QuestionForm";
import { Markdown } from "@/shared/components/Markdown";

export type ToolInvocationPart = {
  type: "dynamic-tool" | `tool-${string}` | "tool-call" | "tool-result";
  toolCallId?: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  result?: unknown;
  approval?: { id: string; approved?: boolean; reason?: string };
  errorText?: string;
  preliminary?: boolean;
};

export type MessagePart =
  | { type: "text"; text: string; state?: string }
  | { type: "reasoning"; text: string; state?: string }
  | ToolInvocationPart
  | { type: `data-${string}`; data?: any; transient?: boolean };

export const isToolPart = (part: MessagePart): part is ToolInvocationPart =>
  part.type === "dynamic-tool" || part.type.startsWith("tool-");

export const hasVisibleText = (text?: string) => Boolean(text && text.trim().length > 0);

export const hasVisiblePart = (part: MessagePart) => {
  if (part.type.startsWith("data-")) {
    return false;
  }
  if (part.type === "text" || part.type === "reasoning") {
    return hasVisibleText(part.text);
  }
  return true;
};

export const renderPart = (
  part: MessagePart,
  helpers: {
    addToolResult?: (params: { toolCallId: string; output: unknown; tool: string }) => unknown;
    addToolApprovalResponse?: (params: {
      id: string;
      approved: boolean;
      reason?: string;
    }) => unknown;
    submittingToolIds: Set<string>;
    markSubmitting: (id: string, value: boolean) => void;
  }
) => {
  if (part.type === "text") {
    return <Markdown content={part.text} />;
  }

  if (part.type === "reasoning") {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        {part.text}
      </div>
    );
  }

  if (isToolPart(part)) {
    const toolName = part.toolName ?? part.type.replace("tool-", "");
    const toolCallId = part.toolCallId || toolName;

    if (toolName === "collect_inputs" && part.state !== "output-available") {
      const request = part.input as CollectInputsToolInput | undefined;
      const isSubmitting = helpers.submittingToolIds.has(toolCallId);
      if (!request) {
        return (
          <span className="text-xs text-muted-foreground">
            {i18n.t("assistant.awaitingInputs")}
          </span>
        );
      }
      return (
        <QuestionForm
          request={request}
          disabled={isSubmitting}
          onSubmit={async (output: CollectInputsToolOutput) => {
            if (!helpers.addToolResult) {
              return;
            }
            helpers.markSubmitting(toolCallId, true);
            await Promise.resolve(
              helpers.addToolResult({
                toolCallId,
                output,
                tool: "collect_inputs",
              })
            );
            helpers.markSubmitting(toolCallId, false);
          }}
          onCancel={async () => {
            if (!helpers.addToolResult) {
              return;
            }
            helpers.markSubmitting(toolCallId, true);
            await Promise.resolve(
              helpers.addToolResult({
                toolCallId,
                output: { values: {}, meta: { cancelled: true } },
                tool: "collect_inputs",
              })
            );
            helpers.markSubmitting(toolCallId, false);
          }}
        />
      );
    }

    if (
      part.state === "approval-requested" &&
      part.approval?.id &&
      helpers.addToolApprovalResponse
    ) {
      const approvalId = part.approval.id;
      return (
        <Card className="border-dashed border-accent/40 bg-accent/5 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.6)]">
          <CardContent className="p-4 text-xs space-y-3">
            <div className="font-semibold text-foreground">
              {i18n.t("assistant.approvalRequired", { toolName })}
            </div>
            <div className="text-muted-foreground leading-relaxed">
              {i18n.t("assistant.approvalDescription", { toolName })}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="accent"
                onClick={() =>
                  helpers.addToolApprovalResponse?.({ id: approvalId, approved: true })
                }
              >
                {i18n.t("common.allow")}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  helpers.addToolApprovalResponse?.({ id: approvalId, approved: false })
                }
              >
                {i18n.t("common.deny")}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (part.state === "output-available") {
      const rawOutput = part.output ?? part.result ?? part.input;
      if (typeof rawOutput === "string") {
        return (
          <Card className="border-border/60 bg-background/70 shadow-[0_14px_40px_-30px_rgba(0,0,0,0.5)]">
            <CardContent className="p-4 text-xs space-y-2">
              <div className="font-semibold">{i18n.t("assistant.toolResult", { toolName })}</div>
              <Markdown content={rawOutput} className="text-muted-foreground" />
            </CardContent>
          </Card>
        );
      }
      return (
        <Card className="border-border/60 bg-background/70 shadow-[0_14px_40px_-30px_rgba(0,0,0,0.5)]">
          <CardContent className="p-4 text-xs space-y-2">
            <div className="font-semibold">{i18n.t("assistant.toolResult", { toolName })}</div>
            <pre className="whitespace-pre-wrap text-muted-foreground">
              {JSON.stringify(rawOutput, null, 2)}
            </pre>
          </CardContent>
        </Card>
      );
    }

    if (part.state === "output-error" || part.state === "output-denied") {
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {i18n.t("assistant.toolFailed", {
            toolName,
            reason: part.errorText ?? i18n.t("assistant.denied"),
          })}
        </div>
      );
    }

    return (
      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-accent/70" />
        {i18n.t("assistant.toolCall", { toolName, toolCallId })}
      </span>
    );
  }

  if (part.type.startsWith("data-")) {
    return null;
  }

  return null;
};
