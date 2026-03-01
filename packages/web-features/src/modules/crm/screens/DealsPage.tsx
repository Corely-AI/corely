import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Briefcase, KanbanSquare, LayoutList, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { DEFAULT_PIPELINE_STAGES } from "@corely/contracts";
import { EmptyState } from "@corely/web-shared/shared/components/EmptyState";
import { DealCard } from "../components/DealCard";
import { DealsBoardView } from "../components/deals-board-view";
import { useDealsList, dealsListQueryKey } from "../hooks/use-deals-list";
import { useQueryClient } from "@tanstack/react-query";

type ViewMode = "list" | "board";

export default function DealsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const view: ViewMode = searchParams.get("view") === "board" ? "board" : "list";

  function setView(next: ViewMode) {
    setSearchParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        updated.set("view", next);
        return updated;
      },
      { replace: true }
    );
  }

  // Collect any filters from URL (extensible)
  const listParams = {
    pageSize: 100, // API limit is max(100)
  } as const;

  const { data: dealsData, isLoading, isError, refetch } = useDealsList(listParams);

  const deals = dealsData?.deals ?? [];
  const stages = DEFAULT_PIPELINE_STAGES;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="crm-deals-page">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-h1 text-foreground" data-testid="crm-deals-header">
          {t("crm.deals.title")}
        </h1>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div
            className="flex items-center gap-1 p-1 bg-muted rounded-lg border border-border"
            role="group"
            aria-label="View mode"
          >
            <button
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              data-testid="crm-deals-view-list"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                view === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="List view"
            >
              <LayoutList className="h-4 w-4" />
              List
            </button>
            <button
              onClick={() => setView("board")}
              aria-pressed={view === "board"}
              data-testid="crm-deals-view-board"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                view === "board"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Board view"
            >
              <KanbanSquare className="h-4 w-4" />
              Board
            </button>
          </div>

          {/* New deal button */}
          <Button
            variant="accent"
            onClick={() => navigate("/crm/deals/new")}
            data-testid="crm-deals-create"
          >
            <Plus className="h-4 w-4" />
            {t("crm.deals.new")}
          </Button>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {view === "board" ? (
        <DealsBoardView
          deals={deals}
          stages={stages}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => {
            void queryClient.invalidateQueries({
              queryKey: dealsListQueryKey(listParams),
            });
            void refetch();
          }}
          listParams={listParams}
        />
      ) : isLoading ? (
        /* List loading skeleton */
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="crm-deals-list-skeleton"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <Card data-testid="crm-deals-error">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-muted-foreground text-sm">Failed to load deals.</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : deals.length === 0 ? (
        <Card data-testid="crm-deals-empty">
          <CardContent className="p-0">
            <EmptyState
              icon={Briefcase}
              title={t("crm.deals.emptyTitle")}
              description={t("crm.deals.emptyDescription")}
            />
          </CardContent>
        </Card>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="crm-deals-list"
        >
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onClick={() => navigate(`/crm/deals/${deal.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
