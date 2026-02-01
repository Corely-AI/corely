import React, { useState, useEffect } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/shared/ui/sheet";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { ScrollArea } from "@/shared/ui/scroll-area";
import type { FilterSpec, FilterOperator } from "@corely/contracts";

export type FilterFieldType = "text" | "number" | "date" | "select" | "boolean";

export interface FilterFieldDef {
  key: string;
  label: string;
  type: FilterFieldType;
  options?: { label: string; value: string | number }[]; // For 'select' type
}

interface FilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterSpec[];
  onApply: (filters: FilterSpec[]) => void;
  fields: FilterFieldDef[];
}

const OPERATORS_BY_TYPE: Record<FilterFieldType, { label: string; value: FilterOperator }[]> = {
  text: [
    { label: "Contains", value: "contains" },
    { label: "Equals", value: "eq" },
    { label: "Starts with", value: "startsWith" },
    { label: "Is empty", value: "isNull" },
    { label: "Is not empty", value: "isNotNull" },
  ],
  number: [
    { label: "Equals", value: "eq" },
    { label: "Greater than", value: "gte" },
    { label: "Less than", value: "lte" },
  ],
  date: [
    { label: "Is", value: "eq" },
    { label: "After", value: "gte" },
    { label: "Before", value: "lte" },
  ],
  select: [
    { label: "Multi select", value: "in" },
    { label: "Is", value: "eq" },
  ],
  boolean: [
    { label: "Client", value: "eq" }, // Boolean usually just check eq true/false
  ],
};

export const FilterPanel: React.FC<FilterPanelProps> = ({
  open,
  onOpenChange,
  filters: initialFilters,
  onApply,
  fields,
}) => {
  const [localFilters, setLocalFilters] = useState<FilterSpec[]>([]);
  const prevOpen = React.useRef(open);

  // Sync when opening
  useEffect(() => {
    if (open && !prevOpen.current) {
      setLocalFilters(initialFilters || []);
    }
    prevOpen.current = open;
  }, [open, initialFilters]);

  const addFilter = () => {
    if (fields.length === 0) {
      return;
    }
    const defaultField = fields[0];
    const defaultOp = OPERATORS_BY_TYPE[defaultField.type][0].value;
    setLocalFilters([...localFilters, { field: defaultField.key, operator: defaultOp, value: "" }]);
  };

  const removeFilter = (index: number) => {
    const next = [...localFilters];
    next.splice(index, 1);
    setLocalFilters(next);
  };

  const updateFilter = (index: number, updates: Partial<FilterSpec>) => {
    const next = [...localFilters];
    const current = next[index];
    const fieldDef = fields.find((f) => f.key === (updates.field || current.field));

    // If field changes, reset operator and value
    if (updates.field && updates.field !== current.field && fieldDef) {
      updates.operator = OPERATORS_BY_TYPE[fieldDef.type][0].value;
      updates.value = "";
    }

    next[index] = { ...current, ...updates };
    setLocalFilters(next);
  };

  const handleApply = () => {
    // Filter out invalid entries?
    onApply(localFilters);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[540px] flex flex-col p-0 gap-0">
        <SheetHeader className="p-6 border-b border-border">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Narrow down your results by adding one or more filters.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {localFilters.map((filter, index) => {
              const fieldDef = fields.find((f) => f.key === filter.field);
              const operators = fieldDef
                ? OPERATORS_BY_TYPE[fieldDef.type]
                : OPERATORS_BY_TYPE.text;

              return (
                <div
                  key={index}
                  className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-card/50 relative group"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => removeFilter(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  <div className="flex gap-2">
                    {/* Field Select */}
                    <div className="w-1/3">
                      <Label className="text-xs text-muted-foreground mb-1 block">Field</Label>
                      <Select
                        value={filter.field}
                        onValueChange={(val) => updateFilter(index, { field: val })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fields.map((f) => (
                            <SelectItem key={f.key} value={f.key}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Operator Select */}
                    <div className="w-1/3">
                      <Label className="text-xs text-muted-foreground mb-1 block">Operator</Label>
                      <Select
                        value={filter.operator}
                        onValueChange={(val) =>
                          updateFilter(index, { operator: val as FilterOperator })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {operators.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Value Input */}
                  <div>
                    {filter.operator === "isNull" || filter.operator === "isNotNull" ? null : (
                      <>
                        <Label className="text-xs text-muted-foreground mb-1 block">Value</Label>
                        {fieldDef?.type === "select" && fieldDef.options ? (
                          <Select
                            value={String(filter.value)}
                            onValueChange={(val) => updateFilter(index, { value: val })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select value" />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldDef.options.map((opt) => (
                                <SelectItem key={opt.label} value={String(opt.value)}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : fieldDef?.type === "date" ? (
                          <Input
                            type="date"
                            className="h-9"
                            value={String(filter.value)}
                            onChange={(e) => updateFilter(index, { value: e.target.value })}
                          />
                        ) : (
                          <Input
                            type={fieldDef?.type === "number" ? "number" : "text"}
                            className="h-9"
                            value={String(filter.value)}
                            onChange={(e) => updateFilter(index, { value: e.target.value })}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {localFilters.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                No active filters
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={addFilter}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Filter
            </Button>
          </div>
        </ScrollArea>

        <SheetFooter className="p-6 border-t border-border mt-auto">
          <Button variant="outline" onClick={() => setLocalFilters([])}>
            Clear all
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
