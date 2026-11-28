import React, { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@corely/ui";
import {
  OperationalTaskApplyResultSchema,
  OperationalTaskCompletionSchema,
  OperationalTaskListResultSchema,
  OperationalTaskTools,
} from "@corely/contracts";
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  fetchCopilotHistory,
  useCopilotChatOptions,
  type CopilotChatMessage,
} from "@/lib/copilot-api";
import { useAuth } from "@/lib/auth-provider";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { useWorkspaceConfig } from "@/shared/workspaces/workspace-config-provider";
import { PageLoadingSkeleton } from "@/shared/components/page-loading-skeleton";

type MessagePart = {
  type: string;
  text?: string;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  result?: unknown;
  state?: string;
  approval?: { id: string; approved?: boolean; reason?: string };
  errorText?: string;
};

const ConfirmCard: React.FC<{
  toolCallId: string;
  toolName: string;
  details?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ toolCallId, toolName, details, onConfirm, onCancel }) => {
  const { t } = useTranslation();

  return (
    <div className="my-2 rounded-md border border-border bg-card p-3 text-card-foreground shadow-sm">
      <div className="text-sm font-semibold">{t("copilot.confirmation.title")}</div>
      {details ?? (
        <div className="text-xs text-muted-foreground">
          {t("copilot.confirmation.subtitle", { toolName, toolCallId })}
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <Button size="sm" onClick={onConfirm} data-testid={`confirm-${toolCallId}`}>
          {t("common.confirm")}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} data-testid={`cancel-${toolCallId}`}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
};

const MessageBubble: React.FC<{
  role: string;
  children: React.ReactNode;
}> = ({ role, children }) => {
  const { t } = useTranslation();
  const roleLabel = role === "user" ? t("copilot.roles.user") : t("copilot.roles.assistant");

  return (
    <div
      className={`max-w-3xl w-full p-3 rounded-lg ${
        role === "user" ? "ml-auto bg-muted text-foreground" : "bg-card text-card-foreground"
      } border border-border shadow-sm`}
    >
      <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {roleLabel}
      </div>
      <div className="space-y-1 text-sm leading-relaxed">{children}</div>
    </div>
  );
};

function taskAssistantCopy(language: string) {
  return language?.startsWith("de")
    ? {
        complete: "Aufgabe abschließen",
        version: "Version",
        unavailable: "Der Assistent ist nicht verfügbar.",
        tasks: "Tagesaufgaben",
        prompt: "Fragen Sie zu Ihren Aufgaben…",
      }
    : language?.startsWith("vi")
      ? {
          complete: "Hoàn thành công việc",
          version: "Phiên bản",
          unavailable: "Trợ lý hiện không khả dụng.",
          tasks: "Công việc hằng ngày",
          prompt: "Hỏi về công việc…",
        }
      : {
          complete: "Complete task",
          version: "Version",
          unavailable: "The assistant is unavailable.",
          tasks: "Daily Work",
          prompt: "Ask about tasks…",
        };
}

export const CopilotPage: React.FC<{ activeModule?: "freelancer" | "tasks" }> = ({
  activeModule = "freelancer",
}) => {
  const { t, i18n } = useTranslation();
  const operational = activeModule === "tasks";
  const reviewCopy = taskAssistantCopy(i18n.language);
  const {
    options: chatOptions,
    runId,
    apiBase,
    workspaceId,
    accessToken,
  } = useCopilotChatOptions({
    activeModule,
    ...(operational ? { runIdMode: "controlled" as const } : {}),
    locale: i18n.language,
  });

  const {
    messages,
    sendMessage,
    addToolResult,
    addToolApprovalResponse,
    setMessages,
    error,
    status,
  } = useChat<CopilotChatMessage>({
    ...chatOptions,
    ...(operational
      ? {
          id: "tasks-current-session",
          sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
        }
      : {}),
  });
  const [hydratedRunId, setHydratedRunId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };
  const handleSubmit = (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }
    void sendMessage({ text: trimmed });
    setInput("");
  };

  useEffect(() => {
    if (operational) {
      return;
    }
    let cancelled = false;
    void fetchCopilotHistory({ runId, apiBase, workspaceId, accessToken })
      .then((history) => {
        if (!cancelled && (!hydratedRunId || hydratedRunId !== runId)) {
          setMessages(history);
          setHydratedRunId(runId);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch copilot history:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, apiBase, hydratedRunId, operational, runId, setMessages, workspaceId]);

  const renderPart = (part: MessagePart, messageId: string) => {
    if (part.type === "text") {
      return <p className="whitespace-pre-wrap">{part.text}</p>;
    }
    if (part.type === "reasoning") {
      return <p className="text-xs text-muted-foreground">{part.text}</p>;
    }
    if (
      part.type === "tool-call" ||
      part.type === "dynamic-tool" ||
      part.type.startsWith("tool-")
    ) {
      const toolCallId = part.toolCallId || messageId;
      const toolName = part.toolName || part.type.replace("tool-", "");
      if (toolName === "invoice.issue" || toolName === "expense.confirmCreate") {
        return (
          <ConfirmCard
            key={toolCallId}
            toolCallId={toolCallId}
            toolName={toolName}
            onConfirm={() =>
              addToolResult?.({
                toolCallId,
                result: { confirmed: true },
                toolName,
              } as any)
            }
            onCancel={() =>
              addToolResult?.({
                toolCallId,
                result: { confirmed: false },
                toolName,
              } as any)
            }
          />
        );
      }
      if (part.state === "approval-requested" && part.approval?.id) {
        const proposal =
          toolName === OperationalTaskTools.apply
            ? OperationalTaskCompletionSchema.safeParse(part.input)
            : undefined;
        if (proposal && !proposal.success) {
          return (
            <p role="alert" className="text-sm text-destructive">
              {t("copilot.denied")}
            </p>
          );
        }
        return (
          <ConfirmCard
            key={toolCallId}
            toolCallId={toolCallId}
            toolName={toolName}
            details={
              proposal?.success ? (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">
                    {reviewCopy.complete} · {proposal.data.title}
                  </p>
                  <p className="text-muted-foreground">
                    {reviewCopy.version} {proposal.data.version}
                  </p>
                </div>
              ) : undefined
            }
            onConfirm={() =>
              addToolApprovalResponse?.({ id: part.approval?.id ?? toolCallId, approved: true })
            }
            onCancel={() =>
              addToolApprovalResponse?.({ id: part.approval?.id ?? toolCallId, approved: false })
            }
          />
        );
      }
      if (toolName === OperationalTaskTools.propose && part.state === "output-available") {
        // The next approval card displays the reviewed data without the proposal proof.
        return null;
      }
      if (operational && part.state === "output-available") {
        const list =
          toolName === OperationalTaskTools.list
            ? OperationalTaskListResultSchema.safeParse(part.output)
            : undefined;
        if (list?.success && list.data.tasks.length) {
          return (
            <div className="space-y-1 text-sm">
              <ul className="list-disc pl-5">
                {list.data.tasks.map((task) => (
                  <li key={task.taskId}>{task.title}</li>
                ))}
              </ul>
              <p className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Link to="/tasks" className="underline">
                  {reviewCopy.tasks}
                </Link>
                <time dateTime={list.data.retrievedAt}>
                  {new Date(list.data.retrievedAt).toLocaleString(i18n.language)}
                </time>
              </p>
            </div>
          );
        }
        const applied =
          toolName === OperationalTaskTools.apply
            ? OperationalTaskApplyResultSchema.safeParse(part.output)
            : undefined;
        if (applied?.success) {
          return (
            <Link className="text-sm underline" to={applied.data.source.path}>
              {applied.data.task.title}
            </Link>
          );
        }
        return null;
      }
      if (operational && (part.state === "output-error" || part.state === "output-denied")) {
        return (
          <p role="status" className="text-sm text-destructive">
            {part.errorText ?? t("copilot.denied")}
          </p>
        );
      }
      if (part.state === "output-available") {
        return (
          <div className="text-xs text-green-700">
            {t("copilot.toolResult", {
              toolName,
              result: JSON.stringify(part.output ?? part.result ?? part.input),
            })}
          </div>
        );
      }
      if (part.state === "output-error" || part.state === "output-denied") {
        return (
          <div className="text-xs text-destructive">
            {t("copilot.toolFailed", {
              toolName,
              reason: part.errorText ?? t("copilot.denied"),
            })}
          </div>
        );
      }
      return operational ? null : (
        <div className="text-xs text-gray-600">
          {t("copilot.toolCall", { toolName, toolCallId })}
        </div>
      );
    }
    if (part.type.startsWith("data-")) {
      return null;
    }
    return null;
  };

  const formatMessageContent = (value: unknown) => {
    if (value == null) {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{t("copilot.title")}</h1>
        {operational && (
          <Link className="text-sm underline" to="/tasks">
            {reviewCopy.tasks}
          </Link>
        )}
      </div>
      {operational && error && (
        <p role="alert" className="text-sm text-destructive">
          {reviewCopy.unavailable}
        </p>
      )}

      <div className="h-[60vh] overflow-y-auto rounded-md border border-border bg-background p-3 shadow-sm">
        {messages.map((m) => (
          <div key={m.id} className="mb-3 flex flex-col gap-1">
            <MessageBubble role={m.role}>
              {(m.parts as MessagePart[] | undefined)?.length
                ? (m.parts as MessagePart[]).map((p, idx) => (
                    <div key={idx}>{renderPart(p, m.id)}</div>
                  ))
                : m.content != null && (
                    <p className="whitespace-pre-wrap">{formatMessageContent(m.content)}</p>
                  )}
            </MessageBubble>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-foreground"
          value={input}
          onChange={handleInputChange}
          placeholder={operational ? reviewCopy.prompt : t("copilot.placeholder")}
          aria-label={operational ? reviewCopy.prompt : t("copilot.placeholder")}
        />
        <Button
          type="submit"
          disabled={operational && (status === "submitted" || status === "streaming")}
        >
          {t("assistant.send")}
        </Button>
      </form>
    </div>
  );
};

export function OperationalCopilotPage() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const { hasCapability, isLoading } = useWorkspaceConfig();
  if (isLoading) {
    return <PageLoadingSkeleton />;
  }
  if (!activeWorkspaceId || !hasCapability("ai.copilot")) {
    const copy = taskAssistantCopy(i18n.language);
    return (
      <div className="space-y-3 p-4">
        <p role="status">{copy.unavailable}</p>
        <Button variant="outline" asChild>
          <Link to="/tasks">{copy.tasks}</Link>
        </Button>
      </div>
    );
  }
  return (
    <CopilotPage
      key={JSON.stringify([user?.userId, user?.activeTenantId, activeWorkspaceId])}
      activeModule="tasks"
    />
  );
}

export default CopilotPage;
