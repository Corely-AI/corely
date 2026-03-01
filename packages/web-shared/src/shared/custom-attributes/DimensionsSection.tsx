import React from "react";
import { useQueries } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Checkbox } from "@corely/ui";
import { Label } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import type { DimensionValueDto, EntityDimensionAssignment } from "@corely/contracts";
import { customAttributesApi } from "@corely/web-shared/lib/custom-attributes-api";
import { useDimensionTypes, useEntityDimensions } from "./hooks";

interface DimensionsSectionProps {
  entityType: string;
  entityId?: string;
  mode?: "edit" | "read";
  value?: EntityDimensionAssignment[];
  onChange?: (assignments: EntityDimensionAssignment[]) => void;
}

function toAssignmentsMap(assignments: EntityDimensionAssignment[]) {
  const map = new Map<string, string[]>();
  for (const assignment of assignments) {
    map.set(assignment.typeId, assignment.valueIds ?? []);
  }
  return map;
}

function mapToAssignments(map: Map<string, string[]>) {
  return Array.from(map.entries()).map(([typeId, valueIds]) => ({
    typeId,
    valueIds,
  }));
}

export function DimensionsSection({
  entityType,
  entityId,
  mode = "edit",
  value,
  onChange,
}: DimensionsSectionProps) {
  const { data: types = [], isLoading: isTypesLoading } = useDimensionTypes(entityType);
  const { data: entityDimensions, isLoading: isEntityDimensionsLoading } = useEntityDimensions(
    entityId ? { entityType, entityId } : undefined
  );

  const [localAssignments, setLocalAssignments] = React.useState<Map<string, string[]>>(new Map());

  React.useEffect(() => {
    if (value) {
      setLocalAssignments(toAssignmentsMap(value));
      return;
    }
    if (entityDimensions?.assignments) {
      setLocalAssignments(toAssignmentsMap(entityDimensions.assignments));
    }
  }, [value, entityDimensions]);

  const valueMap = value ? toAssignmentsMap(value) : localAssignments;

  const valueQueries = useQueries({
    queries: types.map((type) => ({
      queryKey: ["dimension-values", type.id],
      queryFn: () => customAttributesApi.listDimensionValues(type.id),
      enabled: Boolean(type.id),
    })),
  });

  const valuesByType = new Map<string, Array<{ id: string; name: string; isActive: boolean }>>();
  types.forEach((type, index) => {
    const rows = ((valueQueries[index]?.data as DimensionValueDto[] | undefined) ?? []).filter(
      (row): row is DimensionValueDto =>
        Boolean(row && typeof row.id === "string" && typeof row.name === "string")
    );
    valuesByType.set(
      type.id,
      rows
        .filter((row) => row.isActive)
        .map((row) => ({ id: row.id, name: row.name, isActive: row.isActive }))
    );
  });

  const updateAssignments = (next: Map<string, string[]>) => {
    if (!value) {
      setLocalAssignments(next);
    }
    onChange?.(mapToAssignments(next));
  };

  const setSingleValue = (typeId: string, valueId: string) => {
    const next = new Map(valueMap);
    next.set(typeId, valueId ? [valueId] : []);
    updateAssignments(next);
  };

  const toggleMultiValue = (typeId: string, valueId: string, checked: boolean) => {
    const current = new Set(valueMap.get(typeId) ?? []);
    if (checked) {
      current.add(valueId);
    } else {
      current.delete(valueId);
    }
    const next = new Map(valueMap);
    next.set(typeId, Array.from(current));
    updateAssignments(next);
  };

  if (isTypesLoading || isEntityDimensionsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dimensions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading dimensions...</div>
        </CardContent>
      </Card>
    );
  }

  const activeTypes = types.filter((type) => type.isActive);
  if (activeTypes.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dimensions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeTypes.map((type) => {
          const selected = valueMap.get(type.id) ?? [];
          const values = valuesByType.get(type.id) ?? [];

          return (
            <div key={type.id} className="space-y-2">
              <Label>
                {type.name}
                {type.requiredFor.some((requiredType) => requiredType === entityType) ? (
                  <span className="text-destructive ml-1">*</span>
                ) : null}
              </Label>

              {mode === "read" ? (
                <div className="text-sm text-muted-foreground">
                  {selected.length
                    ? values
                        .filter((item) => selected.includes(item.id))
                        .map((item) => item.name)
                        .join(", ")
                    : "-"}
                </div>
              ) : type.allowMultiple ? (
                <div className="space-y-2 rounded-md border border-border p-3">
                  {values.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selected.includes(item.id)}
                        onCheckedChange={(checked) =>
                          toggleMultiValue(type.id, item.id, checked === true)
                        }
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <Select
                  value={selected[0] ?? ""}
                  onValueChange={(valueId) => setSingleValue(type.id, valueId)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select value" />
                  </SelectTrigger>
                  <SelectContent>
                    {values.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
