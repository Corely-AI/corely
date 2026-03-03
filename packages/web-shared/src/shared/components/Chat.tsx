import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { FileText, Image as ImageIcon, Paperclip, X } from "lucide-react";
import { Badge } from "@corely/ui";
import { Input } from "@corely/ui";
import { Button } from "@corely/ui";
import { fetchCopilotHistory, useCopilotChatOptions } from "@corely/web-shared/lib/copilot-api";
import { useRotatingStatusText } from "@corely/web-shared/shared/components/chat/useRotatingStatusText";
import { type StatusPhase } from "@corely/web-shared/shared/components/chat/statusTexts";
import { cn } from "@corely/web-shared/shared/lib/utils";
import i18n from "@corely/web-shared/shared/i18n";
import { useTranslation } from "react-i18next";

import {
  type MessagePart,
  isToolPart,
  hasVisiblePart,
  hasVisibleText,
  renderPart,
} from "./chat/ChatParts";

export interface Suggestion {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

export interface ChatProps {
  activeModule: string;
  locale?: string;
  placeholder?: string;
  suggestions?: Suggestion[];
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  runId?: string;
  runIdMode?: "persisted" | "controlled";
  onRunIdResolved?: (runId: string) => void;
  onConversationUpdated?: () => void;
  focusMessageId?: string | null;
}

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_ATTACHMENT_MIME_TYPES = new Set(["application/pdf"]);

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
};

const isSupportedAttachment = (file: File): boolean => {
  if (file.type.startsWith("image/")) {
    return true;
  }
  if (ACCEPTED_ATTACHMENT_MIME_TYPES.has(file.type)) {
    return true;
  }
  return file.name.toLowerCase().endsWith(".pdf");
};

const fileToChatPart = async (
  file: File
): Promise<{ type: "file"; mediaType: string; filename: string; url: string }> => {
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
        return;
      }
      reject(new Error("Failed to encode attachment"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to encode attachment"));
    reader.readAsDataURL(file);
  });

  return {
    type: "file",
    mediaType: file.type || "application/octet-stream",
    filename: file.name,
    url,
  };
};

export function Chat({
  activeModule,
  locale = "en",
  placeholder = "Type your message",
  suggestions = [],
  emptyStateTitle,
  emptyStateDescription,
  runId: controlledRunId,
  runIdMode = "persisted",
  onRunIdResolved,
  onConversationUpdated,
  focusMessageId,
}: ChatProps) {
  const { t } = useTranslation();
  const [streamEventStarted, setStreamEventStarted] = useState(false);
  const [toolRequestPending, setToolRequestPending] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const previousStatusRef = useRef<string | undefined>(undefined);

  const handleStreamData = useCallback(
    (data: unknown) => {
      if (!data || typeof data !== "object") {
        return;
      }
      const payload = data as { type?: string; data?: { runId?: string } };
      const type = payload.type;
      if (type === "text-start" || type === "text-delta") {
        setStreamEventStarted(true);
      }
      if (type === "data-run" && payload.data?.runId) {
        onRunIdResolved?.(payload.data.runId);
      }
    },
    [onRunIdResolved]
  );

  const {
    options: chatOptions,
    runId,
    apiBase,
    workspaceId,
    accessToken,
  } = useCopilotChatOptions({
    activeModule,
    locale,
    runId: controlledRunId,
    runIdMode,
    onData: handleStreamData,
  });

  const chat = useChat(chatOptions);
  const [submittingToolIds, setSubmittingToolIds] = useState<Set<string>>(new Set());
  const [hydratedRunId, setHydratedRunId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // AI SDK v3 API - manage input state ourselves
  const messages = chat.messages ?? [];
  const sendMessage = (chat as any).sendMessage;
  const addToolResult = (chat as any).addToolResult;
  const addToolApprovalResponse = (chat as any).addToolApprovalResponse;
  const setMessages = chat.setMessages;
  const status = (chat as any).status;
  const isLoading = status === "streaming" || status === "submitted";
  const roleConfig = {
    user: {
      label: i18n.t("assistant.userRole"),
      align: "items-end",
      badge: "accent" as const,
      bubble:
        "bg-accent text-accent-foreground border border-accent/30 shadow-[0_12px_30px_-20px_rgba(0,0,0,0.5)]",
      tail: "rounded-br-md",
    },
    assistant: {
      label: i18n.t("assistant.assistantRole"),
      align: "items-start",
      badge: "muted" as const,
      bubble:
        "bg-panel/80 text-foreground border border-border/70 shadow-[0_12px_30px_-22px_rgba(0,0,0,0.45)]",
      tail: "rounded-bl-md",
    },
    system: {
      label: i18n.t("assistant.systemRole"),
      align: "items-center",
      badge: "warning" as const,
      bubble:
        "bg-warning-muted text-warning border border-warning/30 shadow-[0_12px_30px_-24px_rgba(0,0,0,0.4)]",
      tail: "",
    },
  };

  const getRoleStyle = (role: string) =>
    roleConfig[role as keyof typeof roleConfig] ?? roleConfig.assistant;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) {
      return;
    }

    const validFiles: File[] = [];
    let firstError: string | null = null;
    for (const file of selected) {
      if (!isSupportedAttachment(file)) {
        firstError ??= t("assistant.attachments.invalidType", { name: file.name });
        continue;
      }
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        firstError ??= t("assistant.attachments.tooLarge", {
          name: file.name,
          maxSize: formatBytes(MAX_ATTACHMENT_SIZE_BYTES),
        });
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setPendingFiles((current) => [...current, ...validFiles]);
    }
    setAttachmentError(firstError);

    e.target.value = "";
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    setAttachmentError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if ((!trimmedInput && pendingFiles.length === 0) || !sendMessage) {
      return;
    }

    setStreamEventStarted(false);
    setToolRequestPending(false);
    try {
      const fileParts =
        pendingFiles.length > 0
          ? await Promise.all(pendingFiles.map((file) => fileToChatPart(file)))
          : undefined;

      await Promise.resolve(
        sendMessage({
          text: trimmedInput || undefined,
          files: fileParts,
        })
      );
      setInput("");
      setPendingFiles([]);
      setAttachmentError(null);
      onConversationUpdated?.();
    } catch (error) {
      console.error("Failed to send message with attachments:", error);
    }
  };

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

  useEffect(() => {
    if (status === "submitted") {
      setStreamEventStarted(false);
    }
  }, [status]);

  useEffect(() => {
    if (!isLoading) {
      setStreamEventStarted(false);
      setToolRequestPending(false);
    }
  }, [isLoading]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    const wasLoading = previousStatus === "streaming" || previousStatus === "submitted";
    if (wasLoading && !isLoading) {
      onConversationUpdated?.();
    }
    previousStatusRef.current = status;
  }, [isLoading, onConversationUpdated, status]);

  useEffect(() => {
    // Reset messages immediately when runId changes
    if (hydratedRunId && hydratedRunId !== runId) {
      setMessages([]);
      setHydratedRunId(null);
    }

    let cancelled = false;
    void fetchCopilotHistory({ runId, apiBase, workspaceId, accessToken })
      .then((history) => {
        if (cancelled) {
          return;
        }
        if (!hydratedRunId || hydratedRunId !== runId) {
          setMessages(history as any);
          setHydratedRunId(runId);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch copilot history:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, apiBase, hydratedRunId, runId, setMessages, workspaceId]);

  const lastUserIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "user") {
        return i;
      }
    }
    return -1;
  }, [messages]);

  const assistantHasOutputAfterLastUser = useMemo(() => {
    if (lastUserIndex < 0) {
      return false;
    }
    return messages.slice(lastUserIndex + 1).some((message) => {
      if (message.role !== "assistant") {
        return false;
      }
      if (Array.isArray(message.parts) && message.parts.length > 0) {
        return (message.parts as MessagePart[]).some((part) => hasVisiblePart(part));
      }
      if (typeof message.content === "string") {
        return hasVisibleText(message.content);
      }
      return false;
    });
  }, [lastUserIndex, messages]);

  const responseStarted = streamEventStarted || assistantHasOutputAfterLastUser;
  const showWaitingStatus =
    (isLoading && !responseStarted) || (toolRequestPending && !streamEventStarted);
  const toolPhase: StatusPhase | undefined =
    showWaitingStatus && (toolRequestPending || submittingToolIds.size > 0) ? "tool" : undefined;

  const { text: statusText } = useRotatingStatusText({
    enabled: showWaitingStatus,
    phase: toolPhase,
    tone: "calm",
  });

  useEffect(() => {
    if (responseStarted) {
      setToolRequestPending(false);
    }
  }, [responseStarted]);

  useEffect(() => {
    if (!focusMessageId || !messages.some((message) => message.id === focusMessageId)) {
      return;
    }
    const element = document.querySelector(`[data-message-id="${focusMessageId}"]`);
    if (!element) {
      return;
    }
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(focusMessageId);
    const timeoutId = window.setTimeout(() => {
      setHighlightedMessageId((current) => (current === focusMessageId ? null : current));
    }, 1600);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [focusMessageId, messages]);

  const addToolResultWithTracking = useCallback(
    async (params: { toolCallId: string; output: unknown; tool: string }) => {
      if (!addToolResult) {
        return;
      }
      setStreamEventStarted(false);
      setToolRequestPending(true);
      await Promise.resolve(addToolResult(params));
      onConversationUpdated?.();
    },
    [addToolResult, onConversationUpdated]
  );

  const addToolApprovalResponseWithTracking = useCallback(
    async (params: { id: string; approved: boolean; reason?: string }) => {
      if (!addToolApprovalResponse) {
        return;
      }
      setStreamEventStarted(false);
      setToolRequestPending(true);
      await Promise.resolve(addToolApprovalResponse(params));
      onConversationUpdated?.();
    },
    [addToolApprovalResponse, onConversationUpdated]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/40 p-4 md:p-6 animate-fade-in">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -right-20 -top-8 h-72 w-72 rounded-full bg-warning/20 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/70 to-transparent" />
        </div>
        <div className="relative space-y-6">
          {messages.length === 0 && suggestions.length > 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 p-6 text-center space-y-4">
              <div className="mx-auto h-1 w-12 rounded-full bg-gradient-to-r from-accent to-warning" />
              {emptyStateTitle && (
                <h3 className="text-xl font-semibold text-foreground">{emptyStateTitle}</h3>
              )}
              {emptyStateDescription && (
                <p className="text-sm text-muted-foreground">{emptyStateDescription}</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.label}
                    variant="outline"
                    size="lg"
                    className="h-auto w-full justify-start gap-3 rounded-2xl border-border/60 bg-background/70 px-4 py-3 text-left shadow-[0_12px_30px_-24px_rgba(0,0,0,0.5)] hover:border-border-strong"
                    onClick={() =>
                      handleInputChange({
                        target: { value: suggestion.value },
                      } as React.ChangeEvent<HTMLInputElement>)
                    }
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <suggestion.icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-foreground">
                        {suggestion.label}
                      </div>
                      <div className="text-xs text-muted-foreground">{suggestion.value}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-6">
            {messages.map((m) => {
              const roleStyle = getRoleStyle(m.role);
              const normalizedParts = (
                m.parts?.length
                  ? (m.parts as MessagePart[])
                  : m.content
                    ? [{ type: "text", text: String(m.content) } as MessagePart]
                    : []
              ).filter(Boolean);
              const visibleParts = normalizedParts.filter((part) => !part.type.startsWith("data-"));

              if (visibleParts.length === 0) {
                return null;
              }

              return (
                <div
                  key={m.id}
                  data-message-id={m.id}
                  className={cn(
                    "flex flex-col gap-2 rounded-2xl p-2 transition-colors",
                    roleStyle.align,
                    highlightedMessageId === m.id ? "bg-accent/10" : ""
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-2",
                      m.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <Badge
                      variant={roleStyle.badge}
                      className="uppercase tracking-[0.2em] text-[10px]"
                    >
                      {roleStyle.label}
                    </Badge>
                  </div>
                  <div className={cn("flex flex-col gap-2", roleStyle.align)}>
                    {visibleParts.map((p, idx) => {
                      const rendered = renderPart(p, {
                        addToolResult: addToolResult ? addToolResultWithTracking : undefined,
                        addToolApprovalResponse: addToolApprovalResponse
                          ? addToolApprovalResponseWithTracking
                          : undefined,
                        submittingToolIds,
                        markSubmitting,
                      });
                      if (!rendered) {
                        return null;
                      }
                      if (isToolPart(p)) {
                        return (
                          <div key={`${m.id}-${idx}`} className="w-full max-w-[min(720px,100%)]">
                            {rendered}
                          </div>
                        );
                      }
                      return (
                        <div
                          key={`${m.id}-${idx}`}
                          className={cn(
                            "max-w-[min(720px,100%)] rounded-2xl px-4 py-3 text-sm leading-relaxed backdrop-blur",
                            roleStyle.bubble,
                            roleStyle.tail
                          )}
                        >
                          {rendered}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {showWaitingStatus && statusText ? (
              <div className="flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent"
                  />
                  <span aria-live="polite" aria-atomic="true">
                    {statusText}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileSelection}
        />
        {pendingFiles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {pendingFiles.map((file, index) => {
              const isImage = file.type.startsWith("image/");
              return (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs"
                >
                  {isImage ? (
                    <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="max-w-[240px] truncate">{file.name}</span>
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    onClick={() => removePendingFile(index)}
                    aria-label={t("assistant.attachments.remove")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
        {attachmentError ? <div className="text-xs text-destructive">{attachmentError}</div> : null}
        <div className="glass flex items-center gap-2 rounded-2xl p-2 shadow-[0_18px_60px_-36px_rgba(0,0,0,0.6)]">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            aria-label={t("assistant.attachments.add")}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="h-12 flex-1 border-transparent bg-transparent text-base shadow-none focus:border-transparent focus:ring-0"
            disabled={isLoading}
          />
          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="px-6"
            disabled={isLoading || (!input.trim() && pendingFiles.length === 0)}
          >
            {isLoading ? t("assistant.sending") : t("assistant.send")}
          </Button>
        </div>
      </form>
    </div>
  );
}
