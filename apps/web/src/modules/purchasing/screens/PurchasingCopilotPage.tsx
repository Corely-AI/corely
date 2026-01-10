import React, { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { purchasingApi } from "@/lib/purchasing-api";
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
  output?: any;
  result?: any;
  state?: string;
  approval?: { id: string; approved?: boolean; reason?: string };
  errorText?: string;
};

const ProposalCard: React.FC<{
  title: string;
  summary?: string;
  onApply?: () => void;
  children?: React.ReactNode;
}> = ({ title, summary, onApply, children }) => (
  <Card className="border border-border bg-muted/30">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {summary && <div className="text-xs text-muted-foreground">{summary}</div>}
        </div>
        {onApply && (
          <Button size="sm" onClick={onApply}>
            Apply
          </Button>
        )}
      </div>
      {children}
    </CardContent>
  </Card>
);

export default function PurchasingCopilotPage() {
  const {
    options: chatOptions,
    runId,
    apiBase,
    tenantId,
    accessToken,
  } = useCopilotChatOptions({
    activeModule: "purchasing",
    locale: "en",
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

  const renderToolResult = (toolName: string, result: any) => {
    if (!result || result.ok !== true) {
      return <div className="text-xs text-muted-foreground">No structured output.</div>;
    }

    if (toolName === "purchasing_createPOFromText") {
      const proposal = result.proposal;
      return (
        <ProposalCard
          title="Purchase Order Draft"
          summary={`Confidence ${(result.confidence * 100).toFixed(0)}%`}
          onApply={async () => {
            await purchasingApi.createPurchaseOrder({
              supplierPartyId: proposal.supplierPartyId || "",
              currency: proposal.currency || "EUR",
              orderDate: proposal.orderDate,
              expectedDeliveryDate: proposal.expectedDeliveryDate,
              notes: proposal.notes,
              lineItems: proposal.lineItems,
            });
          }}
        >
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(proposal, null, 2)}</pre>
        </ProposalCard>
      );
    }

    if (toolName === "purchasing_createBillFromText") {
      const proposal = result.proposal;
      return (
        <ProposalCard
          title="Vendor Bill Draft"
          summary={`Confidence ${(result.confidence * 100).toFixed(0)}%`}
          onApply={async () => {
            await purchasingApi.createVendorBill({
              supplierPartyId: proposal.supplierPartyId || "",
              billNumber: proposal.billNumber,
              billDate: proposal.billDate,
              dueDate: proposal.dueDate,
              currency: proposal.currency || "EUR",
              notes: proposal.notes,
              paymentTerms: proposal.paymentTerms,
              lineItems: proposal.lineItems,
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
        summary={`Confidence ${(result.confidence * 100).toFixed(0)}%`}
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
          <span className="text-muted-foreground">Allow {part.toolName}?</span>
          <Button
            size="sm"
            variant="accent"
            onClick={() =>
              addToolApprovalResponse?.({ id: part.approval?.id ?? "", approved: true })
            }
          >
            Allow
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              addToolApprovalResponse?.({ id: part.approval?.id ?? "", approved: false })
            }
          >
            Deny
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
            Tool {part.toolName} failed: {part.errorText ?? "Denied"}
          </div>
        );
      }
      return <div className="text-xs text-muted-foreground">Tool call: {part.toolName}</div>;
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
        <h1 className="text-h1 text-foreground">Purchasing Copilot</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setInput("Create a vendor bill from this text: ...")}
          >
            Prompt: Bill from text
          </Button>
          <Button
            variant="outline"
            onClick={() => setInput("Create a purchase order from this text: ...")}
          >
            Prompt: PO from text
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="h-[60vh] overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div key={m.id} className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">{m.role}</div>
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
              placeholder="Ask Purchasing Copilot..."
            />
            <Button type="submit">Send</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
