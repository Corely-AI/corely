import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { type CollectInputsToolInput, type CollectInputsToolOutput } from "@corely/contracts";
import { Button } from "@corely/ui";
import {
  buildSchema,
  getEmptyValue,
  getRepeaterInitialValue,
  type FieldErrors,
} from "./forms/QuestionFormHelpers";
import { renderFieldHelper } from "./forms/QuestionFormFields";

type Props = {
  request: CollectInputsToolInput;
  onSubmit: (output: CollectInputsToolOutput) => Promise<void> | void;
  onCancel?: () => Promise<void> | void;
  disabled?: boolean;
};

export const QuestionForm: React.FC<Props> = ({ request, onSubmit, onCancel, disabled }) => {
  const { t } = useTranslation();
  const fields = Array.isArray(request.fields) ? request.fields : [];

  const [values, setValues] = useState<Record<string, unknown>>(
    Object.fromEntries(
      fields.map((field) => [
        field.key,
        field.type === "repeater" ? getRepeaterInitialValue(field) : getEmptyValue(field),
      ])
    )
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validators = useMemo(
    () =>
      z.object(
        Object.fromEntries(fields.map((field) => [field.key, buildSchema(field)]))
      ) as z.ZodSchema<Record<string, unknown>>,
    [fields]
  );

  const handleChange = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const parsed = validators.safeParse(values);
    if (parsed.success) {
      setErrors({});
      return { ok: true as const, data: parsed.data };
    }
    const fieldErrors: FieldErrors = {};
    parsed.error.issues.forEach((issue) => {
      const [fieldKey, rowIndex, nestedKey] = issue.path;
      if (typeof fieldKey !== "string") {
        return;
      }
      if (typeof rowIndex === "number" && typeof nestedKey === "string") {
        const existing = fieldErrors[fieldKey];
        const repeaterError: any = typeof existing === "object" ? existing : { rows: {} };
        if (!repeaterError.rows) {
          repeaterError.rows = {};
        }
        const rowErrors = repeaterError.rows[rowIndex] ?? {};
        rowErrors[nestedKey] = issue.message;
        repeaterError.rows[rowIndex] = rowErrors;
        fieldErrors[fieldKey] = repeaterError;
        return;
      }
      fieldErrors[fieldKey] = issue.message;
    });
    setErrors(fieldErrors);
    return { ok: false as const };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validate();
    if (!result.ok) {
      return;
    }
    setIsSubmitting(true);
    await onSubmit({
      values,
      meta: { filledAt: new Date().toISOString(), editedKeys: Object.keys(values) },
    });
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <label htmlFor={field.key} className="text-sm font-semibold text-foreground">
              {field.label}
              {field.required ? " *" : ""}
            </label>
            {field.description ? (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            ) : null}
            {renderFieldHelper(
              field,
              values,
              errors,
              handleChange,
              t,
              disabled || false,
              isSubmitting,
              getEmptyValue
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={disabled || isSubmitting}
          >
            {t("common.cancel")}
          </Button>
        ) : null}
        <Button type="submit" variant="accent" disabled={disabled || isSubmitting}>
          {isSubmitting ? t("common.saving") : t("forms.submit")}
        </Button>
      </div>
    </form>
  );
};
