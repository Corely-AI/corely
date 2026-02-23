import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { DealDto, PipelineStage } from "@corely/contracts";
import { StageColumn, StageColumnSkeleton } from "./stage-column";
import { DealKanbanCard } from "./deal-kanban-card";
import type { DealsListParams } from "../hooks/use-deals-list";
import { useUpdateDealStage } from "../hooks/use-update-deal-stage";
import { Briefcase, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DealsBoardViewProps {
  deals: DealDto[];
  stages: PipelineStage[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  listParams?: DealsListParams;
}

export function DealsBoardView({
  deals,
  stages,
  isLoading = false,
  isError = false,
  onRetry,
  listParams,
}: DealsBoardViewProps) {
  const navigate = useNavigate();
  const [activeDeal, setActiveDeal] = useState<DealDto | null>(null);
  const { mutate: updateStage } = useUpdateDealStage();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Group deals by stageId
  const dealsByStage = stages.reduce<Record<string, DealDto[]>>((acc, stage) => {
    acc[stage.id] = deals.filter((d) => d.stageId === stage.id);
    return acc;
  }, {});

  function handleDragStart({ active }: DragStartEvent) {
    const deal = deals.find((d) => d.id === active.id);
    setActiveDeal(deal ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveDeal(null);

    if (!over) {return;}

    const draggedDeal = deals.find((d) => d.id === active.id);
    if (!draggedDeal) {return;}

    // `over.id` can be a stage id (droppable) or another deal id (sortable).
    // Resolve the target stage id.
    let targetStageId: string;

    const isOverStage = stages.some((s) => s.id === over.id);
    if (isOverStage) {
      targetStageId = String(over.id);
    } else {
      // over is a deal id – find which stage that deal belongs to
      const overDeal = deals.find((d) => d.id === over.id);
      if (!overDeal) {return;}
      targetStageId = overDeal.stageId;
    }

    if (draggedDeal.stageId === targetStageId) {return;}

    updateStage({
      dealId: draggedDeal.id,
      newStageId: targetStageId,
      listParams,
    });
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 px-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <StageColumnSkeleton key={i} />
        ))}
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground"
        data-testid="crm-board-error"
      >
        <p className="text-sm">Failed to load deals.</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-primary hover:underline"
            data-testid="crm-board-retry"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (deals.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground"
        data-testid="crm-board-empty"
      >
        <Briefcase className="h-12 w-12 opacity-20" />
        <div className="text-center space-y-1">
          <p className="font-medium text-foreground">No deals yet</p>
          <p className="text-sm">Create your first deal to populate the board.</p>
        </div>
        <button
          onClick={() => navigate("/crm/deals/new")}
          className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          data-testid="crm-board-add-deal-cta"
        >
          <Plus className="h-4 w-4" />
          Add deal
        </button>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="flex gap-4 overflow-x-auto pb-4 px-1 h-[calc(100vh-200px)] items-start"
        data-testid="crm-deals-board"
      >
        {stages.map((stage) => (
          <StageColumn key={stage.id} stage={stage} deals={dealsByStage[stage.id] ?? []} />
        ))}
      </div>

      {/* Drag overlay: floating ghost card */}
      <DragOverlay>
        {activeDeal ? <DealKanbanCard deal={activeDeal} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
