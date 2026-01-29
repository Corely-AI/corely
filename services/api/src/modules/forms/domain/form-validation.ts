import { ValidationFailedError } from "@corely/domain";
import type { FormField, FormFieldConfig, FormFieldType } from "./form-definition.entity";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeOptions = (config: FormFieldConfig): string[] => {
  if (!config || typeof config !== "object") {
    return [];
  }
  const raw = (config as Record<string, unknown>).options;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((value) => typeof value === "string" && value.trim().length > 0) as string[];
};

export const assertFormName = (name: string) => {
  if (!name || name.trim().length === 0) {
    throw new ValidationFailedError("Form name is required", [
      { message: "Form name is required", members: ["name"] },
    ]);
  }
};

export const assertFieldDefinition = (
  field: Pick<FormField, "label" | "type" | "order" | "key"> & {
    required?: boolean;
    configJson?: FormFieldConfig;
  }
) => {
  const errors: { message: string; members?: string[] }[] = [];

  if (!field.label || field.label.trim().length === 0) {
    errors.push({ message: "Field label is required", members: ["label"] });
  }

  if (!field.key || field.key.trim().length === 0) {
    errors.push({ message: "Field key is required", members: ["key"] });
  }

  if (field.order < 0) {
    errors.push({ message: "Field order must be zero or greater", members: ["order"] });
  }

  if (field.type === "SINGLE_SELECT" || field.type === "MULTI_SELECT") {
    const options = normalizeOptions(field.configJson ?? null);
    if (options.length === 0) {
      errors.push({
        message: "Select fields require non-empty options",
        members: ["configJson", "options"],
      });
    }
  }

  if (errors.length > 0) {
    throw new ValidationFailedError("Invalid field definition", errors);
  }
};

const isRequiredValueMissing = (type: FormFieldType, value: unknown) => {
  if (value === null || value === undefined) {
    return true;
  }
  if (type === "BOOLEAN") {
    return typeof value !== "boolean";
  }
  if (type === "NUMBER") {
    return typeof value !== "number" || Number.isNaN(value);
  }
  if (type === "DATE" || type === "SHORT_TEXT" || type === "LONG_TEXT" || type === "EMAIL") {
    return typeof value !== "string" || value.trim().length === 0;
  }
  if (type === "SINGLE_SELECT") {
    return typeof value !== "string" || value.trim().length === 0;
  }
  if (type === "MULTI_SELECT") {
    return !Array.isArray(value) || value.length === 0;
  }
  return false;
};

const assertValueType = (field: FormField, value: unknown) => {
  if (value === null || value === undefined) {
    return;
  }

  switch (field.type) {
    case "SHORT_TEXT":
    case "LONG_TEXT": {
      if (typeof value !== "string") {
        throw new ValidationFailedError("Invalid field value", [
          { message: "Expected string", members: [field.key] },
        ]);
      }
      return;
    }
    case "EMAIL": {
      if (typeof value !== "string" || !EMAIL_REGEX.test(value)) {
        throw new ValidationFailedError("Invalid email", [
          { message: "Invalid email", members: [field.key] },
        ]);
      }
      return;
    }
    case "NUMBER": {
      if (typeof value !== "number" || Number.isNaN(value)) {
        throw new ValidationFailedError("Invalid number", [
          { message: "Expected number", members: [field.key] },
        ]);
      }
      return;
    }
    case "BOOLEAN": {
      if (typeof value !== "boolean") {
        throw new ValidationFailedError("Invalid boolean", [
          { message: "Expected boolean", members: [field.key] },
        ]);
      }
      return;
    }
    case "DATE": {
      if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) {
        throw new ValidationFailedError("Invalid date", [
          { message: "Expected ISO date string", members: [field.key] },
        ]);
      }
      return;
    }
    case "SINGLE_SELECT": {
      if (typeof value !== "string") {
        throw new ValidationFailedError("Invalid selection", [
          { message: "Expected string", members: [field.key] },
        ]);
      }
      const options = normalizeOptions(field.configJson ?? null);
      if (options.length > 0 && !options.includes(value)) {
        throw new ValidationFailedError("Invalid selection", [
          { message: "Value must be one of the options", members: [field.key] },
        ]);
      }
      return;
    }
    case "MULTI_SELECT": {
      if (!Array.isArray(value)) {
        throw new ValidationFailedError("Invalid selection", [
          { message: "Expected array", members: [field.key] },
        ]);
      }
      const options = normalizeOptions(field.configJson ?? null);
      if (options.length > 0) {
        const invalid = value.filter((item) => !options.includes(String(item)));
        if (invalid.length > 0) {
          throw new ValidationFailedError("Invalid selection", [
            { message: "One or more values are not allowed", members: [field.key] },
          ]);
        }
      }
      return;
    }
    default:
      return;
  }
};

export const validateSubmissionPayload = (
  fields: FormField[],
  payload: Record<string, unknown>
) => {
  const errors: { message: string; members?: string[] }[] = [];

  for (const field of fields) {
    const value = payload[field.key];

    if (field.required && isRequiredValueMissing(field.type, value)) {
      errors.push({ message: "Field is required", members: [field.key] });
      continue;
    }

    if (value !== undefined && value !== null) {
      try {
        assertValueType(field, value);
      } catch (error) {
        if (error instanceof ValidationFailedError && error.validationErrors) {
          errors.push(...error.validationErrors);
        } else {
          errors.push({ message: "Invalid value", members: [field.key] });
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationFailedError("Submission validation failed", errors);
  }
};

export const normalizeFieldKey = (value: string) => {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "field";
};
