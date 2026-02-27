"use client";

import type { CatalogVariantDto } from "@corely/contracts";
import { Button } from "@/components/ui";
import { getVariantLabel } from "../lib/pricing";

type VariantSelectorProps = {
  variants: CatalogVariantDto[];
  selectedVariantId: string | null;
  onSelect: (variantId: string) => void;
};

export function VariantSelector({ variants, selectedVariantId, onSelect }: VariantSelectorProps) {
  const activeVariants = variants.filter((variant) => variant.status === "ACTIVE");

  if (activeVariants.length === 0) {
    return <p className="text-sm text-muted-foreground">No purchasable variants available.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {activeVariants.map((variant) => {
        const isSelected = variant.id === selectedVariantId;
        return (
          <Button
            key={variant.id}
            type="button"
            size="sm"
            variant={isSelected ? "accent" : "outline"}
            onClick={() => onSelect(variant.id)}
          >
            {getVariantLabel(variant)}
          </Button>
        );
      })}
    </div>
  );
}
