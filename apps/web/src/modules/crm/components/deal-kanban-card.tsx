import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DealDto } from "@corely/contracts";
import { DealStatusBadge } from "./DealStatusBadge";
import { Calendar, DollarSign, GripVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DealKanbanCardProps {
  deal: DealDto;
  isDragging?: boolean;
}

export const DealKanbanCard: FC<DealKanbanCardProps> = ({ deal, isDragging = false }) => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  const formattedAmount =
    deal.amountCents !== null
      ? new Intl.NumberFormat(i18n.language, {
          style: "currency",
          currency: deal.currency,
          maximumFractionDigits: 0,
        }).format(deal.amountCents / 100)
      : null;

  const updatedAgo = formatDistanceToNow(new Date(deal.updatedAt), { addSuffix: true });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-card rounded-lg border border-border p-3 shadow-sm cursor-pointer select-none
        hover:shadow-md hover:border-primary/30 transition-all duration-150
        ${isDragging ? "shadow-xl ring-2 ring-primary/40 rotate-1" : ""}
      `}
      data-testid={`crm-deal-kanban-card-${deal.id}`}
      onClick={() => navigate(`/crm/deals/${deal.id}`)}
    >
      {/* Drag handle row */}
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 shrink-0 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Drag deal"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title */}
          <p className="font-medium text-sm text-foreground leading-tight line-clamp-2">
            {deal.title}
          </p>

          {/* Status badge */}
          <DealStatusBadge status={deal.status} />

          {/* Amount */}
          {formattedAmount && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3 shrink-0" />
              <span className="font-medium text-foreground">{formattedAmount}</span>
            </div>
          )}

          {/* Updated at */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{updatedAgo}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
