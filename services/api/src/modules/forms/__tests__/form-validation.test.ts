import { describe, it, expect } from "vitest";
import { ValidationFailedError } from "@corely/domain";
import { assertFieldDefinition, validateSubmissionPayload } from "../domain/form-validation";
import type { FormField } from "../domain/form-definition.entity";

const buildField = (overrides: Partial<FormField> = {}): FormField => ({
  id: "field-1",
  tenantId: "tenant-1",
  formId: "form-1",
  key: "favorite_color",
  label: "Favorite color",
  type: "SINGLE_SELECT",
  required: true,
  helpText: null,
  order: 0,
  configJson: { options: ["red", "blue"] },
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  ...overrides,
});

describe("Form validation", () => {
  it("requires options for select fields", () => {
    const field = buildField({ configJson: {} });
    expect(() =>
      assertFieldDefinition({
        key: field.key,
        label: field.label,
        type: field.type,
        order: field.order,
        required: field.required,
        configJson: field.configJson,
      })
    ).toThrow(ValidationFailedError);
  });

  it("validates submission payload for required and types", () => {
    const fields: FormField[] = [
      buildField({ key: "email", type: "EMAIL" }),
      buildField({
        key: "quantity",
        type: "NUMBER",
        required: true,
        configJson: null,
      }),
      buildField({
        key: "colors",
        type: "MULTI_SELECT",
        required: true,
        configJson: { options: ["red", "blue"] },
      }),
    ];

    expect(() =>
      validateSubmissionPayload(fields, {
        email: "not-an-email",
        quantity: "oops",
        colors: ["green"],
      })
    ).toThrow(ValidationFailedError);
  });
});
