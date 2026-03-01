import type { FC } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { DealDto, PipelineStage } from "@corely/contracts";
import { DealKanbanCard } from "./deal-kanban-card";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

interface StageColumnProps {
  stage: PipelineStage;
  deals: DealDto[];
  isOver?: boolean;
}

function CardSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border p-3 animate-pulse space-y-2">
      <div className="h-3 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
      <div className="h-3 bg-muted rounded w-1/3" />
    </div>
  );
}

export function StageColumnSkeleton() {
  return (
    <div className="flex flex-col gap-3 min-w-[260px] max-w-[300px] shrink-0">
      <div className="h-8 bg-muted rounded animate-pulse" />
      <div className="space-y-2">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

// Stage colour theming
const stageColors: Record<string, { header: string; badge: string }> = {
  lead: {
    header: "bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
  },
  qualified: {
    header: "bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
  },
  proposal: {
    header: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  },
  negotiation: {
    header: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  },
  won: {
    header: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  },
  lost: {
    header: "bg-gray-50 border-gray-200 dark:bg-gray-900/30 dark:border-gray-700",
    badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

function getStageColor(stageId: string) {
  return (
    stageColors[stageId] ?? {
      header: "bg-muted/50 border-border",
      badge: "bg-muted text-muted-foreground",
    }
  );
}

export const StageColumn: FC<StageColumnProps> = ({ stage, deals }) => {
  const navigate = useNavigate();
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const colors = getStageColor(stage.id);

  const totalAmountCents = deals.reduce((sum, d) => sum + (d.amountCents ?? 0), 0);
  const hasAmount = deals.some((d) => d.amountCents !== null);

  const dealIds = deals.map((d) => d.id);

  return (
    <div className="flex flex-col gap-2 min-w-[260px] max-w-[300px] shrink-0 h-full">
      {/* Column header */}
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-lg border ${colors.header} sticky top-0 z-10`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm text-foreground truncate">{stage.name}</span>
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${colors.badge}`}
            data-testid={`crm-board-stage-count-${stage.id}`}
          >
            {deals.length}
          </span>
        </div>
        {hasAmount && (
          <span className="text-xs text-muted-foreground shrink-0 ml-2">
            {new Intl.NumberFormat("en", {
              style: "currency",
              currency: deals.find((d) => d.amountCents !== null)?.currency ?? "USD",
              maximumFractionDigits: 0,
              notation: "compact",
            }).format(totalAmountCents / 100)}
          </span>
        )}
      </div>

      {/* Droppable column body */}
      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 rounded-xl p-2 min-h-[120px] transition-colors duration-150
          ${isOver ? "bg-primary/5 ring-2 ring-primary/20" : "bg-muted/20"}
        `}
        data-testid={`crm-board-column-${stage.id}`}
      >
        <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
          {deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50 text-xs gap-2">
              <span>Drop deals here</span>
            </div>
          ) : (
            deals.map((deal) => <DealKanbanCard key={deal.id} deal={deal} />)
          )}
        </SortableContext>

        {/* Add deal CTA */}
        <button
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1 px-1 py-1 rounded hover:bg-accent/50 transition-colors w-full"
          onClick={() => navigate(`/crm/deals/new`)}
          data-testid={`crm-board-add-deal-${stage.id}`}
          aria-label={`Add deal in ${stage.name}`}
        >
          <Plus className="h-3 w-3 shrink-0" />
          Add deal
        </button>
      </div>
    </div>
  );
};
