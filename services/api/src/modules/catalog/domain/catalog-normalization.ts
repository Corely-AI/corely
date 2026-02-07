import { ValidationError } from "@corely/kernel";

const normalize = (value: string): string => value.trim().replace(/\s+/g, "-").toUpperCase();

export const normalizeCatalogCode = (value: string): string => {
  const normalized = normalize(value);
  if (!normalized) {
    throw new ValidationError("Item code is required");
  }
  return normalized;
};

export const normalizeCatalogSku = (value: string): string => {
  const normalized = normalize(value);
  if (!normalized) {
    throw new ValidationError("Variant SKU is required");
  }
  return normalized;
};
