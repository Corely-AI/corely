import React from "react";
import type { CustomizableEntityType, EntityDimensionAssignment } from "@corely/contracts";
import { DimensionsSection } from "./DimensionsSection";
import { CustomFieldsSection } from "./CustomFieldsSection";

export interface CustomAttributesValue {
  dimensionAssignments: EntityDimensionAssignment[];
  customFieldValues: Record<string, unknown>;
}

interface CustomAttributesSectionProps {
  entityType: CustomizableEntityType;
  entityId?: string;
  mode?: "edit" | "read";
  value?: CustomAttributesValue;
  onChange?: (next: CustomAttributesValue) => void;
}

export function CustomAttributesSection({
  entityType,
  entityId,
  mode = "edit",
  value,
  onChange,
}: CustomAttributesSectionProps) {
  const [localValue, setLocalValue] = React.useState<CustomAttributesValue>({
    dimensionAssignments: [],
    customFieldValues: {},
  });

  React.useEffect(() => {
    if (value) {
      setLocalValue(value);
    }
  }, [value]);

  const effectiveValue = value ?? localValue;

  const update = (patch: Partial<CustomAttributesValue>) => {
    const next = {
      ...effectiveValue,
      ...patch,
    };
    if (!value) {
      setLocalValue(next);
    }
    onChange?.(next);
  };

  return (
    <div className="space-y-4">
      <DimensionsSection
        entityType={entityType}
        entityId={entityId}
        mode={mode}
        value={effectiveValue.dimensionAssignments}
        onChange={(dimensionAssignments) => update({ dimensionAssignments })}
      />
      <CustomFieldsSection
        entityType={entityType}
        entityId={entityId}
        mode={mode}
        value={effectiveValue.customFieldValues}
        onChange={(customFieldValues) => update({ customFieldValues })}
      />
    </div>
  );
}
