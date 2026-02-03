import React, { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@corely/ui";
import { Card, CardContent } from "@corely/ui";
import { purchasingApi } from "@/lib/purchasing-api";
import { useTranslation } from "react-i18next";
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

type ToolResult = {
  ok?: boolean;
  confidence?: number;
  proposal?: Record<string, unknown>;
} & Record<string, unknown>;

const ProposalCard: React.FC<{
  title: string;
  summary?: string;
  onApply?: () => void;
  children?: React.ReactNode;
}> = ({ title, summary, onApply, children }) => {
  const { t } = useTranslation();

  return (
    <Card className="border border-border bg-muted/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">{title}</div>
            {summary && <div className="text-xs text-muted-foreground">{summary}</div>}
          </div>
          {onApply && (
            <Button size="sm" onClick={onApply}>
              {t("common.apply")}
            </Button>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
};

export default function PurchasingCopilotPage() {
  const { t, i18n } = useTranslation();
  const {
    options: chatOptions,
    runId,
    apiBase,
    workspaceId,
    accessToken,
  } = useCopilotChatOptions({
    activeModule: "purchasing",
    locale: i18n.language,
  });

  const { messages, sendMessage, addToolApprovalResponse, setMessages } =
    useChat<CopilotChatMessage>(chatOptions);
  const [input, setInput] = useState("");
  const [hydratedRunId, setHydratedRunId] = useState<string | null>(null);
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
  }, [accessToken, apiBase, hydratedRunId, runId, setMessages, workspaceId]);

  const renderToolResult = (toolName: string, result: unknown) => {
    const parsed = result as ToolResult | null;
    if (!parsed || parsed.ok !== true) {
      return <div className="text-xs text-muted-foreground">{t("copilot.noStructuredOutput")}</div>;
    }

    if (toolName === "purchasing_createPOFromText") {
      const proposal = parsed.proposal ?? {};
      return (
        <ProposalCard
          title={t("purchasing.copilot.purchaseOrderDraft")}
          summary={t("copilot.confidence", {
            percent: Math.round((parsed.confidence ?? 0) * 100),
          })}
          onApply={async () => {
            await purchasingApi.createPurchaseOrder({
              supplierPartyId: String(proposal.supplierPartyId ?? ""),
              currency: String(proposal.currency ?? "EUR"),
              orderDate: String(proposal.orderDate ?? ""),
              expectedDeliveryDate: proposal.expectedDeliveryDate
                ? String(proposal.expectedDeliveryDate)
                : undefined,
              notes: proposal.notes ? String(proposal.notes) : undefined,
              lineItems: Array.isArray(proposal.lineItems) ? proposal.lineItems : [],
            });
          }}
        >
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(proposal, null, 2)}</pre>
        </ProposalCard>
      );
    }

    if (toolName === "purchasing_createBillFromText") {
      const proposal = parsed.proposal ?? {};
      return (
        <ProposalCard
          title={t("purchasing.copilot.vendorBillDraft")}
          summary={t("copilot.confidence", {
            percent: Math.round((parsed.confidence ?? 0) * 100),
          })}
          onApply={async () => {
            await purchasingApi.createVendorBill({
              supplierPartyId: String(proposal.supplierPartyId ?? ""),
              billNumber: proposal.billNumber ? String(proposal.billNumber) : undefined,
              billDate: proposal.billDate ? String(proposal.billDate) : undefined,
              dueDate: proposal.dueDate ? String(proposal.dueDate) : undefined,
              currency: String(proposal.currency ?? "EUR"),
              notes: proposal.notes ? String(proposal.notes) : undefined,
              paymentTerms: proposal.paymentTerms ? String(proposal.paymentTerms) : undefined,
              lineItems: Array.isArray(proposal.lineItems) ? proposal.lineItems : [],
            });
          }}
        >
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(proposal, null, 2)}</pre>
        </ProposalCard>
      );
    }

    return (
      <ProposalCard
        title={toolName}
        summary={t("copilot.confidence", {
          percent: Math.round((parsed.confidence ?? 0) * 100),
        })}
      >
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
      </ProposalCard>
    );
  };

  const renderPart = (part: MessagePart) => {
    if (part.type === "text") {
      return <p className="whitespace-pre-wrap">{part.text}</p>;
    }
    if (part.type === "reasoning") {
      return <p className="text-xs text-muted-foreground">{part.text}</p>;
    }
    if (part.state === "approval-requested" && part.approval?.id) {
      return (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {t("copilot.allowTool", { toolName: part.toolName ?? "" })}
          </span>
          <Button
            size="sm"
            variant="accent"
            onClick={() =>
              addToolApprovalResponse?.({ id: part.approval?.id ?? "", approved: true })
            }
          >
            {t("common.allow")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              addToolApprovalResponse?.({ id: part.approval?.id ?? "", approved: false })
            }
          >
            {t("common.deny")}
          </Button>
        </div>
      );
    }
    if (
      part.type === "tool-call" ||
      part.type === "dynamic-tool" ||
      part.type.startsWith("tool-")
    ) {
      if (part.state === "output-available") {
        return (
          <div className="space-y-2">
            {renderToolResult(part.toolName ?? "tool", part.output ?? part.result ?? part.input)}
          </div>
        );
      }
      if (part.state === "output-error" || part.state === "output-denied") {
        return (
          <div className="text-xs text-destructive">
            {t("copilot.toolFailed", {
              toolName: part.toolName ?? "",
              reason: part.errorText ?? t("copilot.denied"),
            })}
          </div>
        );
      }
      return (
        <div className="text-xs text-muted-foreground">
          {t("copilot.toolCall", { toolName: part.toolName ?? "" })}
        </div>
      );
    }
    if (part.type === "tool-result") {
      return (
        <div className="space-y-2">
          {renderToolResult(part.toolName ?? "tool", part.output ?? part.result ?? part.input)}
        </div>
      );
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
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">{t("purchasing.copilot.title")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setInput(t("purchasing.copilot.promptBill"))}>
            {t("purchasing.copilot.promptBillLabel")}
          </Button>
          <Button variant="outline" onClick={() => setInput(t("purchasing.copilot.promptPo"))}>
            {t("purchasing.copilot.promptPoLabel")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="h-[60vh] overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div key={m.id} className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">
                  {m.role === "user" ? t("copilot.roles.user") : t("copilot.roles.assistant")}
                </div>
                {(m.parts as MessagePart[] | undefined)?.length
                  ? (m.parts as MessagePart[]).map((p, idx) => <div key={idx}>{renderPart(p)}</div>)
                  : m.content != null && (
                      <p className="whitespace-pre-wrap">{formatMessageContent(m.content)}</p>
                    )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              className="flex-1 border rounded px-3 py-2 text-sm"
              value={input}
              onChange={handleInputChange}
              placeholder={t("purchasing.copilot.placeholder")}
            />
            <Button type="submit">{t("common.send")}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
