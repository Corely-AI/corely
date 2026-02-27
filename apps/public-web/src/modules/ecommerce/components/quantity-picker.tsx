"use client";

import { Button } from "@/components/ui";

type QuantityPickerProps = {
  value: number;
  onChange: (nextQty: number) => void;
  min?: number;
  max?: number;
};

export function QuantityPicker({ value, onChange, min = 1, max = 99 }: QuantityPickerProps) {
  const nextMinus = Math.max(min, value - 1);
  const nextPlus = Math.min(max, value + 1);

  return (
    <div className="inline-flex items-center rounded-md border border-border">
      <Button
        type="button"
        variant="ghost"
        className="h-9 rounded-r-none px-3"
        onClick={() => onChange(nextMinus)}
        disabled={value <= min}
      >
        -
      </Button>
      <span className="w-10 text-center text-sm font-medium">{value}</span>
      <Button
        type="button"
        variant="ghost"
        className="h-9 rounded-l-none px-3"
        onClick={() => onChange(nextPlus)}
        disabled={value >= max}
      >
        +
      </Button>
    </div>
  );
}
