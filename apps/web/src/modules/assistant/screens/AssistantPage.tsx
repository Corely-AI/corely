import React, { useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  AlertCircle,
  FileText,
  Loader2,
  Paperclip,
  Receipt,
  Send,
  Sparkles,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { useCopilotChatOptions } from "@/lib/copilot-api";
import { cn } from "@/shared/lib/utils";
import { QuestionForm } from "@/shared/components/QuestionForm";
import { type CollectInputsToolInput, type CollectInputsToolOutput } from "@corely/contracts";

type ToolInvocationPart = {
  type: string;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  result?: unknown;
  state?: string;
  approval?: { id: string; approved?: boolean; reason?: string };
  errorText?: string;
};

type MessagePart =
  | { type: "text"; text: string; state?: string }
  | { type: "reasoning"; text: string; state?: string }
  | ToolInvocationPart
  | { type: string; data?: any; transient?: boolean };

const suggestions = [
  {
    icon: Receipt,
    label: "Extract a receipt and create an expense",
    value: "I uploaded a receipt. Extract it and draft an expense.",
  },
  {
    icon: FileText,
    label: "Generate an invoice draft",
    value: "Generate an invoice draft for ACME GmbH for this month.",
  },
  {
    icon: TrendingUp,
    label: "Summarize my expenses",
    value: "Summarize my expenses for the last 30 days.",
  },
  {
    icon: AlertCircle,
    label: "Tax guidance",
    value: "What can I deduct as a freelancer in Germany?",
  },
];

const MessageBubble: React.FC<{ role: string; children: React.ReactNode }> = ({
  role,
  children,
}) => (
  <div
    className={cn(
      "max-w-3xl w-full rounded-2xl px-4 py-3 shadow-sm border",
      role === "user"
        ? "ml-auto bg-accent text-accent-foreground border-accent/30"
        : "bg-muted text-foreground border-border"
    )}
  >
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{role}</div>
    <div className="space-y-2 text-sm leading-relaxed">{children}</div>
  </div>
);

const renderPart = (
  part: MessagePart,
  helpers: {
    addToolResult?: (params: { toolCallId: string; result: unknown; toolName?: string }) => unknown;
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
    return <p className="whitespace-pre-wrap">{part.text}</p>;
  }

  if (part.type === "reasoning") {
    return <p className="text-xs text-muted-foreground">{part.text}</p>;
  }

  if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
    const toolName = part.toolName || part.type.replace("tool-", "");
    const toolCallId = part.toolCallId || toolName;

    if (toolName === "collect_inputs" && part.state !== "output-available") {
      const request = part.input as CollectInputsToolInput | undefined;
      const isSubmitting = helpers.submittingToolIds.has(toolCallId);
      if (!request) {
        return <span className="text-xs text-muted-foreground">Awaiting collect_inputs...</span>;
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
                result: output,
                toolName: "collect_inputs",
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
                result: { values: {}, meta: { cancelled: true } },
                toolName: "collect_inputs",
              })
            );
            helpers.markSubmitting(toolCallId, false);
          }}
        />
      );
    }

    if (part.state === "approval-requested" && part.approval?.id) {
      return (
        <Card className="bg-background border-dashed border-primary/40">
          <CardContent className="p-3 text-xs space-y-2">
            <div className="font-semibold">Approval required: {toolName}</div>
            <div className="text-muted-foreground">
              The assistant wants to call <strong>{toolName}</strong>. Allow?
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="accent"
                onClick={() =>
                  helpers.addToolApprovalResponse?.({ id: part.approval?.id, approved: true })
                }
              >
                Allow
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  helpers.addToolApprovalResponse?.({ id: part.approval?.id, approved: false })
                }
              >
                Deny
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (part.state === "output-available") {
      return (
        <Card className="bg-background border-border">
          <CardContent className="p-3 text-xs space-y-1">
            <div className="font-semibold">Tool result: {toolName}</div>
            <pre className="whitespace-pre-wrap text-muted-foreground">
              {JSON.stringify(part.output ?? part.result ?? part.input, null, 2)}
            </pre>
          </CardContent>
        </Card>
      );
    }

    if (part.state === "output-error" || part.state === "output-denied") {
      return (
        <div className="text-xs text-destructive">
          Tool {toolName} failed: {part.errorText ?? "Denied"}
        </div>
      );
    }

    return (
      <span className="text-xs text-muted-foreground">
        Tool call: {toolName} ({toolCallId})...
      </span>
    );
  }

  if (part.type.startsWith("data-")) {
    return null;
  }

  return null;
};

export default function AssistantPage() {
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [submittingToolIds, setSubmittingToolIds] = useState<Set<string>>(new Set());

  const chatOptions = useCopilotChatOptions({
    activeModule: "assistant",
    locale: "en",
  });

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    addToolResult,
    addToolApprovalResponse,
  } = useChat(chatOptions.options);

  const markSubmitting = (id: string, value: boolean) => {
    setSubmittingToolIds((prev) => {
      const next = new Set(prev);
      if (value) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen" data-testid="assistant-chat">
      <header className="flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Assistant</h1>
            <p className="text-sm text-muted-foreground">
              Ask anything, extract receipts, generate invoices, or request quick summaries.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6" data-testid="assistant-messages">
          {messages.length === 0 ? (
            <div className="text-center py-12 space-y-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-accent/10">
                <Wand2 className="h-8 w-8 text-accent" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">How can I help you?</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Ask anything, extract receipts, generate invoices, or request quick summaries.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.label}
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={() =>
                      handleInputChange({
                        target: { value: suggestion.value },
                      } as React.ChangeEvent<HTMLInputElement>)
                    }
                  >
                    <suggestion.icon className="h-4 w-4" />
                    {suggestion.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            {messages.map((m) => (
              <div key={m.id} className="flex">
                {m.role === "assistant" && (
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mr-3">
                    <Sparkles className="h-4 w-4 text-accent" />
                  </div>
                )}
                <MessageBubble role={m.role}>
                  {(m.parts as MessagePart[] | undefined)?.length
                    ? (m.parts as MessagePart[]).map((p, idx) => (
                        <div key={idx}>
                          {renderPart(p, {
                            addToolResult,
                            addToolApprovalResponse,
                            submittingToolIds,
                            markSubmitting,
                          })}
                        </div>
                      ))
                    : m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                </MessageBubble>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="flex-shrink-0 border-t border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 space-y-2">
          {attachedFile ? (
            <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-muted">
              <Paperclip className="h-4 w-4" />
              <span className="flex-1 truncate">{attachedFile.name}</span>
              <Button variant="ghost" size="sm" onClick={() => setAttachedFile(null)}>
                Remove
              </Button>
            </div>
          ) : null}
          <form onSubmit={handleSubmit} className="flex gap-2 items-center">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask anything..."
              data-testid="assistant-input"
              className="flex-1"
            />
            <Button
              type="submit"
              variant="accent"
              size="icon"
              data-testid="assistant-submit"
              disabled={!input.trim() || isLoading}
              className="shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </footer>
    </div>
  );
}
