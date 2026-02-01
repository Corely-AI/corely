import React from "react";
import { X } from "lucide-react";
import { Badge } from "@/shared/ui/badge"; // Ensure badge exists or use div
import { Button } from "@/shared/ui/button";
import type { FilterSpec } from "@corely/contracts";

export interface ActiveFilterChipsProps {
  filters: FilterSpec[];
  onRemove: (filter: FilterSpec) => void;
  onClearAll: () => void;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  filters,
  onRemove,
  onClearAll,
}) => {
  if (!filters.length) {
    return null;
  }

  const formatValue = (val: any) => {
    if (Array.isArray(val)) {
      return val.join(", ");
    }
    if (val instanceof Date) {
      return val.toLocaleDateString();
    }
    return String(val);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter, idx) => (
        <Badge
          key={`${filter.field}-${filter.operator}-${idx}`}
          variant="secondary"
          className="gap-1 pr-1"
        >
          <span className="font-medium text-muted-foreground">{filter.field}:</span>
          <span>{formatValue(filter.value)}</span>
          <button
            onClick={() => onRemove(filter)}
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" onClick={onClearAll} className="h-6 px-2 text-xs">
        Clear all
      </Button>
    </div>
  );
};
