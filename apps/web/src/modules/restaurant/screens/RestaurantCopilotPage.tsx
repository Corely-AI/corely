import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { RestaurantAiToolCardSchema } from "@corely/contracts";
import { Button, Card, CardContent, Textarea } from "@corely/ui";
import {
  fetchCopilotHistory,
  useCopilotChatOptions,
  type CopilotChatMessage,
} from "@/lib/copilot-api";

type MessagePart = {
  type: string;
  text?: string;
  output?: unknown;
  result?: unknown;
  input?: unknown;
  toolCallId?: string;
  toolName?: string;
  state?: string;
  errorText?: string;
};

const renderCard = (result: unknown) => {
  const parsed = RestaurantAiToolCardSchema.safeParse(result);
  if (!parsed.success) {
    return <div className="text-xs text-muted-foreground">No structured restaurant card.</div>;
  }

  const card = parsed.data;
  if (card.cardType === "restaurant.order-proposal") {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="font-semibold">{card.title}</div>
          <div className="text-sm text-muted-foreground">{card.summary}</div>
          <div className="text-xs text-muted-foreground">{card.rationale}</div>
        </CardContent>
      </Card>
    );
  }
  if (card.cardType === "restaurant.floor-attention") {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="font-semibold">Floor attention</div>
          <div className="text-sm text-muted-foreground">{card.summary}</div>
          {card.items.map((item) => (
            <div key={item.tableId} className="text-sm">
              {item.tableName} · {item.status} · {item.reason}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  if (card.cardType === "restaurant.kitchen-summary") {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="font-semibold">Kitchen delays</div>
          <div className="text-sm text-muted-foreground">{card.summary}</div>
          {card.items.map((item) => (
            <div key={item.ticketId} className="text-sm">
              Ticket {item.ticketId.slice(0, 8)} · {item.status} · {item.ageMinutes}m
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  if (card.cardType === "restaurant.approval-summary") {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="font-semibold">Approval queue</div>
          <div className="text-sm text-muted-foreground">{card.summary}</div>
          {card.items.map((item) => (
            <div key={item.approvalRequestId} className="text-sm">
              {item.type} · {item.status} · {item.reason}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  if (card.cardType === "restaurant.shift-close-summary") {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="font-semibold">Shift close summary</div>
          <div className="text-sm text-muted-foreground">{card.summary}</div>
          {card.anomalies.map((anomaly) => (
            <div key={anomaly} className="text-sm">
              {anomaly}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(card, null, 2)}</pre>
      </CardContent>
    </Card>
  );
};

export default function RestaurantCopilotPage() {
  const uiCopy = useUiCopy("ui.restaurant-restaurantcopilotpage");
  const chatOptions = useCopilotChatOptions({
    activeModule: "restaurant",
    locale: "en",
  });
  const { messages, sendMessage, setMessages } = useChat<CopilotChatMessage>(chatOptions.options);
  const [hydratedRunId, setHydratedRunId] = useState<string | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchCopilotHistory({
      runId: chatOptions.runId,
      apiBase: chatOptions.apiBase,
      workspaceId: chatOptions.workspaceId,
      accessToken: chatOptions.accessToken,
    })
      .then((history) => {
        if (!cancelled && hydratedRunId !== chatOptions.runId) {
          setMessages(history);
          setHydratedRunId(chatOptions.runId);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch restaurant copilot history:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [
    chatOptions.accessToken,
    chatOptions.apiBase,
    chatOptions.runId,
    chatOptions.workspaceId,
    hydratedRunId,
    setMessages,
  ]);

  const handleSubmit = (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    if (!input.trim()) {
      return;
    }
    void sendMessage({ text: input.trim() });
    setInput("");
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">{uiCopy("restaurant-copilot")}</h1>
        <p className="text-sm text-muted-foreground">{uiCopy("use-structured-restaurant-tools")}</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setInput("Summarize which tables need attention right now.")}
            >
              {uiCopy("floor-attention")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setInput("Summarize delayed kitchen tickets for the current queue.")}
            >
              {uiCopy("kitchen-delays")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setInput("Summarize the pending restaurant approval queue.")}
            >
              {uiCopy("approval-queue")}
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              className="min-h-[88px]"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={uiCopy("ask-restaurant-copilot")}
            />
            <Button type="submit">{uiCopy("send")}</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {messages.map((message) => (
          <Card key={message.id}>
            <CardContent className="p-4 space-y-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {message.role}
              </div>
              {(message.parts as MessagePart[] | undefined)?.map((part, index) => {
                if (part.type === "text" && part.text) {
                  return (
                    <div key={`${message.id}-${index}`} className="whitespace-pre-wrap text-sm">
                      {part.text}
                    </div>
                  );
                }
                if (part.state === "output-available" || part.type === "tool-result") {
                  return (
                    <div key={`${message.id}-${index}`}>
                      {renderCard(part.output ?? part.result ?? part.input)}
                    </div>
                  );
                }
                if (part.state === "output-error") {
                  return (
                    <div key={`${message.id}-${index}`} className="text-xs text-destructive">
                      {uiCopy("tool") + " "}
                      {part.toolName}
                      {" " + uiCopy("failed") + " "}
                      {part.errorText ?? uiCopy("unknown-error")}
                    </div>
                  );
                }
                return null;
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
