import React, { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/shared/ui/button";
import {
  fetchCopilotHistory,
  useCopilotChatOptions,
  type CopilotChatMessage,
} from "@/lib/copilot-api";

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
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ toolCallId, toolName, onConfirm, onCancel }) => (
  <div className="border rounded p-3 my-2 bg-white shadow-sm">
    <div className="text-sm font-semibold">Tool confirmation</div>
    <div className="text-xs text-gray-600">
      {toolName} (call: {toolCallId})
    </div>
    <div className="flex gap-2 mt-2">
      <Button size="sm" onClick={onConfirm} data-testid={`confirm-${toolCallId}`}>
        Confirm
      </Button>
      <Button size="sm" variant="secondary" onClick={onCancel} data-testid={`cancel-${toolCallId}`}>
        Cancel
      </Button>
    </div>
  </div>
);

const MessageBubble: React.FC<{
  role: string;
  children: React.ReactNode;
}> = ({ role, children }) => (
  <div
    className={`max-w-3xl w-full p-3 rounded-lg ${
      role === "user" ? "bg-blue-50 text-gray-900 ml-auto" : "bg-gray-50 text-gray-900"
    } border border-gray-200 shadow-sm`}
  >
    <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">{role}</div>
    <div className="space-y-1 text-sm leading-relaxed">{children}</div>
  </div>
);

export const CopilotPage: React.FC = () => {
  const {
    options: chatOptions,
    runId,
    apiBase,
    tenantId,
    accessToken,
  } = useCopilotChatOptions({
    activeModule: "freelancer",
    locale: "en",
  });

  const { messages, sendMessage, addToolResult, addToolApprovalResponse, setMessages } =
    useChat<CopilotChatMessage>(chatOptions);
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
    let cancelled = false;
    void fetchCopilotHistory({ runId, apiBase, tenantId, accessToken })
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
  }, [accessToken, apiBase, hydratedRunId, runId, setMessages, tenantId]);

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
        return (
          <ConfirmCard
            key={toolCallId}
            toolCallId={toolCallId}
            toolName={toolName}
            onConfirm={() =>
              addToolApprovalResponse?.({ id: part.approval?.id ?? toolCallId, approved: true })
            }
            onCancel={() =>
              addToolApprovalResponse?.({ id: part.approval?.id ?? toolCallId, approved: false })
            }
          />
        );
      }
      if (part.state === "output-available") {
        return (
          <div className="text-xs text-green-700">
            Tool result {toolName}: {JSON.stringify(part.output ?? part.result ?? part.input)}
          </div>
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
        <div className="text-xs text-gray-600">
          Tool call: {toolName} ({toolCallId})
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
      <h1 className="text-xl font-semibold">Copilot</h1>

      <div className="border rounded p-3 h-[60vh] overflow-y-auto bg-white shadow-sm">
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
          className="flex-1 border rounded px-3 py-2"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask Copilot..."
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
};

export default CopilotPage;
