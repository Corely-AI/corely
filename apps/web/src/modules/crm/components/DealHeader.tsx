import React, { useMemo } from "react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { MoreHorizontal, Copy, Pencil, Trophy, XOctagon } from "lucide-react";
import { formatMoney } from "@/shared/lib/formatters";
import type { DealDto } from "@corely/contracts";
import { DealStatusBadge } from "./DealStatusBadge";
import { DealStageSelect } from "./DealStageSelect";

interface DealHeaderProps {
  deal: DealDto;
  stages: { id: string; name: string; isClosed?: boolean }[];
  onEdit?: () => void;
  onChangeStage?: (stageId: string) => void;
  onMarkWon?: () => void;
  onMarkLost?: () => void;
  onDelete?: () => void;
}

export const DealHeader: React.FC<DealHeaderProps> = ({
  deal,
  stages,
  onEdit,
  onChangeStage,
  onMarkWon,
  onMarkLost,
  onDelete,
}) => {
  const amount = useMemo(() => {
    if (deal.amountCents === null) {
      return "No amount";
    }
    try {
      return formatMoney(deal.amountCents, "en-US", deal.currency);
    } catch {
      return `${deal.amountCents / 100} ${deal.currency}`;
    }
  }, [deal.amountCents, deal.currency]);

  const copyLink = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-h1 text-foreground">{deal.title}</h1>
          <DealStatusBadge status={deal.status} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{amount}</span>
          <span>•</span>
          <DealStageSelect
            value={deal.stageId}
            stages={stages}
            onChange={(value) => onChangeStage?.(value)}
            showBadge
          />
          {deal.probability !== null && <span>• Probability: {deal.probability}%</span>}
          {deal.expectedCloseDate && (
            <>
              <span>•</span>
              <span>Close: {deal.expectedCloseDate}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={copyLink} size="sm">
          <Copy className="h-4 w-4 mr-1" />
          Copy link
        </Button>
        {onMarkWon && (
          <Button variant="accent" size="sm" onClick={onMarkWon}>
            <Trophy className="h-4 w-4 mr-1" />
            Mark won
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit deal
              </DropdownMenuItem>
            )}
            {onMarkLost && (
              <DropdownMenuItem onClick={onMarkLost}>
                <XOctagon className="mr-2 h-4 w-4" />
                Mark lost
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                Delete deal
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
