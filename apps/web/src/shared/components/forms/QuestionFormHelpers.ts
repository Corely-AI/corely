import { z } from "zod";
import { type CollectInputField, type CollectRepeaterField } from "@corely/contracts";

export const EMPTY_SELECT_VALUE = "__empty__";
export const DEFAULT_MAX_REPEATER_ITEMS = 50;

export const toRegExp = (pattern: string) => {
  const trimmed = pattern.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith("/") && trimmed.lastIndexOf("/") > 0) {
    const lastSlash = trimmed.lastIndexOf("/");
    const body = trimmed.slice(1, lastSlash);
    const flags = trimmed.slice(lastSlash + 1);
    try {
      return new RegExp(body, flags);
    } catch {
      return undefined;
    }
  }

  try {
    return new RegExp(trimmed);
  } catch {
    return undefined;
  }
};

export const buildSchema = (field: CollectInputField): z.ZodTypeAny => {
  if (field.type === "boolean") {
    const schema = z.boolean();
    return field.required ? schema : schema.optional();
  }
  if (field.type === "number") {
    let schema = z.number();
    if (field.min !== undefined) {
      schema = schema.min(field.min);
    }
    if (field.max !== undefined) {
      schema = schema.max(field.max);
    }
    return field.required ? schema : schema.optional();
  }
  if (field.type === "repeater") {
    const itemFields = Array.isArray(field.itemFields) ? field.itemFields : [];
    const itemSchema =
      itemFields.length > 0
        ? z.object(Object.fromEntries(itemFields.map((item) => [item.key, buildSchema(item)])))
        : z.record(z.string(), z.any());
    const maxItems = field.maxItems ?? DEFAULT_MAX_REPEATER_ITEMS;
    const minItems = field.minItems ?? (field.required ? 1 : 0);
    let schema = z.array(itemSchema).max(maxItems);
    if (minItems > 0) {
      schema = schema.min(minItems);
    }
    return field.required || field.minItems !== undefined ? schema : schema.optional();
  }
  if (field.type === "text" || field.type === "textarea") {
    let schema = z.string();
    if (field.minLength !== undefined) {
      schema = schema.min(field.minLength);
    }
    if (field.maxLength !== undefined) {
      schema = schema.max(field.maxLength);
    }
    if (field.pattern) {
      const patternRegex = toRegExp(field.pattern);
      if (patternRegex) {
        schema = schema.regex(patternRegex);
      }
    }
    return field.required ? schema : schema.optional();
  }
  {
    const schema = z.string();
    return field.required ? schema : schema.optional();
  }
};

export const getEmptyValue = (field: CollectInputField): unknown => {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }
  switch (field.type) {
    case "boolean":
      return false;
    case "number":
      return "";
    case "select":
      return "";
    case "repeater":
      return [];
    default:
      return "";
  }
};

export const buildRepeaterRow = (itemFields: CollectInputField[]) =>
  Object.fromEntries(itemFields.map((item) => [item.key, getEmptyValue(item)]));

export const getRepeaterInitialValue = (
  field: CollectRepeaterField
): Array<Record<string, unknown>> => {
  if (Array.isArray(field.defaultValue)) {
    return field.defaultValue as Array<Record<string, unknown>>;
  }
  if (!Array.isArray(field.itemFields)) {
    return [];
  }
  const minItems = field.minItems ?? (field.required ? 1 : 0);
  return Array.from({ length: minItems }, () => buildRepeaterRow(field.itemFields));
};

export type RepeaterRowErrors = Record<number, Record<string, string | undefined>>;
export type RepeaterFieldError = { message?: string; rows?: RepeaterRowErrors };
export type FieldErrors = Record<string, string | RepeaterFieldError | undefined>;

export const ensureRepeaterError = (fieldErrors: FieldErrors, fieldKey: string) => {
  const existing = fieldErrors[fieldKey];
  if (existing && typeof existing === "object") {
    return existing as RepeaterFieldError;
  }
  const next: RepeaterFieldError = existing ? { message: existing as string } : {};
  fieldErrors[fieldKey] = next;
  return next;
};
