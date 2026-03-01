import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { format, isToday, isYesterday, startOfWeek } from "date-fns";
import {
  AlertCircle,
  ChevronDown,
  FileText,
  Loader2,
  Plus,
  Receipt,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from "@corely/ui";
import {
  listCopilotThreads,
  searchCopilotThreads,
  getCopilotThread,
  createCopilotThread,
  type CopilotThreadSearchResult,
} from "@corely/web-shared/lib/copilot-api";
import { Chat, type Suggestion } from "@corely/web-shared/shared/components/Chat";
import { cn } from "@corely/web-shared/shared/lib/utils";
import { useTranslation } from "react-i18next";

type ThreadGroupKey = "today" | "yesterday" | "week" | "older";

interface ThreadGroup {
  key: ThreadGroupKey;
  label: string;
  items: Array<{
    id: string;
    title: string;
    lastMessageAt: string;
  }>;
}

const THREAD_LIST_QUERY_KEY = ["assistant", "threads", "recent"] as const;

const THREAD_GROUP_LABELS: Record<ThreadGroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "This week",
  older: "Older",
};

const getThreadGroupKey = (isoDate: string): ThreadGroupKey => {
  const date = new Date(isoDate);
  if (isToday(date)) {
    return "today";
  }
  if (isYesterday(date)) {
    return "yesterday";
  }
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  if (date >= start) {
    return "week";
  }
  return "older";
};

export default function AssistantPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { threadId } = useParams<{ threadId?: string }>();
  const [searchParams] = useSearchParams();
  const focusedMessageId = searchParams.get("m");
  const queryClient = useQueryClient();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<ThreadGroupKey, boolean>>({
    today: true,
    yesterday: true,
    week: true,
    older: true,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchText]);

  const suggestions: Suggestion[] = [
    {
      icon: Receipt,
      label: t("assistant.suggestions.extractReceipt.label"),
      value: t("assistant.suggestions.extractReceipt.value"),
    },
    {
      icon: FileText,
      label: t("assistant.suggestions.invoiceDraft.label"),
      value: t("assistant.suggestions.invoiceDraft.value"),
    },
    {
      icon: TrendingUp,
      label: t("assistant.suggestions.summarizeExpenses.label"),
      value: t("assistant.suggestions.summarizeExpenses.value"),
    },
    {
      icon: AlertCircle,
      label: t("assistant.suggestions.taxGuidance.label"),
      value: t("assistant.suggestions.taxGuidance.value"),
    },
  ];

  const threadsQuery = useQuery({
    queryKey: THREAD_LIST_QUERY_KEY,
    queryFn: async () => listCopilotThreads({ pageSize: 50 }),
  });

  const threadQuery = useQuery({
    queryKey: ["assistant", "thread", threadId],
    queryFn: async () => getCopilotThread(threadId || ""),
    enabled: Boolean(threadId),
  });

  const searchQuery = useQuery({
    queryKey: ["assistant", "thread-search", debouncedSearchText],
    queryFn: async () => searchCopilotThreads({ q: debouncedSearchText, pageSize: 40 }),
    enabled: searchOpen && debouncedSearchText.length > 1,
  });

  const createThreadMutation = useMutation({
    mutationFn: async () => createCopilotThread(),
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: THREAD_LIST_QUERY_KEY });
      navigate(`/assistant/t/${id}`);
    },
  });

  const groupedThreads = useMemo<ThreadGroup[]>(() => {
    const groups: Record<ThreadGroupKey, ThreadGroup["items"]> = {
      today: [],
      yesterday: [],
      week: [],
      older: [],
    };

    for (const item of threadsQuery.data?.items ?? []) {
      if (
        typeof item.id !== "string" ||
        typeof item.title !== "string" ||
        typeof item.lastMessageAt !== "string"
      ) {
        continue;
      }
      const key = getThreadGroupKey(item.lastMessageAt);
      groups[key].push({
        id: item.id,
        title: item.title,
        lastMessageAt: item.lastMessageAt,
      });
    }

    return (["today", "yesterday", "week", "older"] as const)
      .map((key) => ({
        key,
        label: THREAD_GROUP_LABELS[key],
        items: groups[key],
      }))
      .filter((group) => group.items.length > 0);
  }, [threadsQuery.data?.items]);

  const activeThreadTitle = threadQuery.data?.thread.title ?? t("assistant.title");

  const openThread = (id: string) => {
    navigate(`/assistant/t/${id}`);
  };

  const openSearchResult = (result: CopilotThreadSearchResult) => {
    setSearchOpen(false);
    navigate(`/assistant/t/${result.threadId}?m=${result.messageId}`);
  };

  const handleRunResolved = (resolvedRunId: string) => {
    if (!resolvedRunId) {
      return;
    }

    if (threadId !== resolvedRunId) {
      navigate(`/assistant/t/${resolvedRunId}`, {
        replace: !threadId,
      });
    }
    void queryClient.invalidateQueries({ queryKey: THREAD_LIST_QUERY_KEY });
  };

  const handleConversationUpdated = () => {
    void queryClient.invalidateQueries({ queryKey: THREAD_LIST_QUERY_KEY });
    if (threadId) {
      void queryClient.invalidateQueries({ queryKey: ["assistant", "thread", threadId] });
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen" data-testid="assistant-chat">
      <aside className="hidden w-80 shrink-0 border-r border-border bg-background/80 md:flex md:flex-col">
        <div className="border-b border-border px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">Recent chats</div>
            <Button variant="outline" size="sm" onClick={() => setSearchOpen(true)}>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
          <Button
            className="w-full"
            onClick={() => createThreadMutation.mutate()}
            disabled={createThreadMutation.isPending}
          >
            {createThreadMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            New chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          {threadsQuery.isLoading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Loading chats...</div>
          ) : null}

          {!threadsQuery.isLoading && groupedThreads.length === 0 ? (
            <div className="space-y-1 px-3 py-2">
              <div className="text-sm font-medium text-foreground">No chats yet</div>
              <div className="text-xs text-muted-foreground">
                Start a conversation and it will appear here.
              </div>
            </div>
          ) : null}

          {groupedThreads.map((group) => (
            <Collapsible
              key={group.key}
              open={openGroups[group.key]}
              onOpenChange={(open) => {
                setOpenGroups((current) => ({
                  ...current,
                  [group.key]: open,
                }));
              }}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground hover:bg-muted/50">
                {group.label}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    openGroups[group.key] ? "" : "-rotate-90"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pb-2">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openThread(item.id)}
                    className={cn(
                      "flex w-full flex-col rounded-lg px-2 py-2 text-left transition-colors",
                      threadId === item.id ? "bg-accent/15" : "hover:bg-muted/60"
                    )}
                  >
                    <span className="truncate text-sm font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(item.lastMessageAt), "p")}
                    </span>
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-foreground">
                {activeThreadTitle}
              </h1>
              <p className="text-sm text-muted-foreground">{t("assistant.subtitle")}</p>
            </div>
            <div className="ml-auto md:hidden">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => createThreadMutation.mutate()}
                  disabled={createThreadMutation.isPending}
                >
                  {createThreadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSearchOpen(true)}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-6" data-testid="assistant-messages">
            <Chat
              key={threadId ?? "new-thread"}
              activeModule="assistant"
              locale={i18n.language}
              runId={threadId}
              runIdMode="controlled"
              onRunIdResolved={handleRunResolved}
              onConversationUpdated={handleConversationUpdated}
              focusMessageId={focusedMessageId}
              placeholder={t("assistant.placeholder")}
              suggestions={suggestions}
              emptyStateTitle={t("assistant.emptyStateTitle")}
              emptyStateDescription={t("assistant.emptyStateDescription")}
            />
          </div>
        </main>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Search chats</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              autoFocus
              placeholder="Search messages..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />

            <div className="max-h-96 space-y-2 overflow-y-auto">
              {searchQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">Searching…</div>
              ) : null}

              {!searchQuery.isLoading && debouncedSearchText.length <= 1 ? (
                <div className="text-sm text-muted-foreground">
                  Type at least 2 characters to search.
                </div>
              ) : null}

              {!searchQuery.isLoading &&
              debouncedSearchText.length > 1 &&
              !searchQuery.data?.items.length ? (
                <div className="text-sm text-muted-foreground">No matching messages found.</div>
              ) : null}

              {(searchQuery.data?.items ?? []).map((item) => (
                <button
                  key={`${item.threadId}:${item.messageId}`}
                  type="button"
                  onClick={() => openSearchResult(item)}
                  className="w-full rounded-lg border border-border/60 bg-background p-3 text-left hover:border-border"
                >
                  <div className="truncate text-sm font-semibold text-foreground">
                    {item.threadTitle}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.snippet || "(No preview)"}
                  </div>
                  <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    {format(new Date(item.createdAt), "PP p")}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
