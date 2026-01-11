import React, { useMemo, useState } from "react";
import { z } from "zod";
import {
  type CollectInputsToolInput,
  type CollectInputField,
  type CollectRepeaterField,
  type CollectInputsToolOutput,
} from "@corely/contracts";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Card, CardContent } from "@/shared/ui/card";
import { Calendar } from "@/shared/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";

type Props = {
  request: CollectInputsToolInput;
  onSubmit: (output: CollectInputsToolOutput) => Promise<void> | void;
  onCancel?: () => Promise<void> | void;
  disabled?: boolean;
};

type RepeaterRowErrors = Record<number, Record<string, string | undefined>>;
type RepeaterFieldError = { message?: string; rows?: RepeaterRowErrors };
type FieldErrors = Record<string, string | RepeaterFieldError | undefined>;

const EMPTY_SELECT_VALUE = "__empty__";
const DEFAULT_MAX_REPEATER_ITEMS = 50;

const toRegExp = (pattern: string) => {
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

const buildSchema = (field: CollectInputField): z.ZodTypeAny => {
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

const pad2 = (value: number) => String(value).padStart(2, "0");

const formatDateValue = (date?: Date) => {
  if (!date) {
    return "";
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const parseDateValue = (value?: string) => {
  if (!value) {
    return undefined;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return undefined;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date;
};

const splitDateTimeValue = (value?: string) => {
  if (!value) {
    return { datePart: "", timePart: "" };
  }
  const [datePart = "", timePart = ""] = value.split("T");
  return { datePart, timePart: timePart.slice(0, 5) };
};

const getEmptyValue = (field: CollectInputField): unknown => {
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

const buildRepeaterRow = (itemFields: CollectInputField[]) =>
  Object.fromEntries(itemFields.map((item) => [item.key, getEmptyValue(item)]));

const getRepeaterInitialValue = (field: CollectRepeaterField): Array<Record<string, unknown>> => {
  if (Array.isArray(field.defaultValue)) {
    return field.defaultValue as Array<Record<string, unknown>>;
  }
  if (!Array.isArray(field.itemFields)) {
    return [];
  }
  const minItems = field.minItems ?? (field.required ? 1 : 0);
  return Array.from({ length: minItems }, () => buildRepeaterRow(field.itemFields));
};

const ensureRepeaterError = (fieldErrors: FieldErrors, fieldKey: string) => {
  const existing = fieldErrors[fieldKey];
  if (existing && typeof existing === "object") {
    return existing as RepeaterFieldError;
  }
  const next: RepeaterFieldError = existing ? { message: existing as string } : {};
  fieldErrors[fieldKey] = next;
  return next;
};

export const QuestionForm: React.FC<Props> = ({ request, onSubmit, onCancel, disabled }) => {
  const fields = Array.isArray(request.fields) ? request.fields : [];

  const [values, setValues] = useState<Record<string, unknown>>(
    Object.fromEntries(
      fields.map((field) => {
        if (field.type === "repeater") {
          return [field.key, getRepeaterInitialValue(field)];
        }
        return [field.key, getEmptyValue(field)];
      })
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
        const repeaterError = ensureRepeaterError(fieldErrors, fieldKey);
        if (!repeaterError.rows) {
          repeaterError.rows = {};
        }
        const rowErrors = repeaterError.rows[rowIndex] ?? {};
        rowErrors[nestedKey] = issue.message;
        repeaterError.rows[rowIndex] = rowErrors;
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

  const renderInputField = (
    field: CollectInputField,
    value: unknown,
    onChange: (nextValue: unknown) => void,
    error?: string,
    fieldId?: string
  ) => {
    const commonProps = {
      id: fieldId ?? field.key,
      disabled: disabled || isSubmitting,
      "aria-invalid": Boolean(error),
    };
    if (field.type === "textarea") {
      return (
        <Textarea
          {...commonProps}
          placeholder={field.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }
    if (field.type === "number") {
      return (
        <Input
          type="number"
          {...commonProps}
          placeholder={field.placeholder}
          value={(value as number | string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          min={field.min}
          max={field.max}
          step={field.step}
        />
      );
    }
    if (field.type === "boolean") {
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            {...commonProps}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          {field.placeholder ? (
            <span className="text-xs text-muted-foreground">{field.placeholder}</span>
          ) : null}
        </div>
      );
    }
    if (field.type === "date" || field.type === "datetime") {
      const rawValue = (value as string | undefined) ?? "";
      const { datePart, timePart } = splitDateTimeValue(rawValue);
      const selectedDate = parseDateValue(datePart || rawValue);
      const displayDate = datePart || formatDateValue(selectedDate);

      if (field.type === "date") {
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !displayDate && "text-muted-foreground"
                )}
                disabled={disabled || isSubmitting}
                id={fieldId ?? field.key}
                aria-invalid={Boolean(error)}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {displayDate || field.placeholder || "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => onChange(formatDateValue(date))}
              />
            </PopoverContent>
          </Popover>
        );
      }

      const fallbackTime = timePart || "00:00";
      const timeValue = displayDate ? fallbackTime : "";
      const timeDisabled = !displayDate || disabled || isSubmitting;

      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !displayDate && "text-muted-foreground"
                )}
                disabled={disabled || isSubmitting}
                id={fieldId ?? field.key}
                aria-invalid={Boolean(error)}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {displayDate || field.placeholder || "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  const nextDate = formatDateValue(date);
                  const nextValue = nextDate ? `${nextDate}T${fallbackTime}` : "";
                  onChange(nextValue);
                }}
              />
            </PopoverContent>
          </Popover>
          <Input
            type="time"
            id={`${fieldId ?? field.key}-time`}
            aria-invalid={Boolean(error)}
            value={timeValue}
            onChange={(e) => {
              if (!displayDate) {
                return;
              }
              onChange(`${displayDate}T${e.target.value}`);
            }}
            disabled={timeDisabled}
          />
        </div>
      );
    }
    if (field.type === "select") {
      const options = field.options || [];
      const hasEmptyOption = options.some(
        (opt) => opt.value === "" || opt.value === null || opt.value === undefined
      );
      const normalizedOptions = options.map((opt) => {
        const rawValue = opt.value ?? "";
        const stringValue = String(rawValue);
        return {
          ...opt,
          value: stringValue === "" ? EMPTY_SELECT_VALUE : stringValue,
        };
      });
      const currentValue = value;
      const selectValue =
        currentValue === "" && hasEmptyOption
          ? EMPTY_SELECT_VALUE
          : currentValue === null || currentValue === undefined
            ? ""
            : String(currentValue);
      return (
        <Select
          disabled={disabled || isSubmitting}
          value={selectValue}
          onValueChange={(nextValue) => onChange(nextValue === EMPTY_SELECT_VALUE ? "" : nextValue)}
        >
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || "Select"} />
          </SelectTrigger>
          <SelectContent>
            {normalizedOptions.map((opt, index) => (
              <SelectItem
                key={`${opt.value}-${index}`}
                value={String(opt.value)}
                disabled={opt.disabled}
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    return (
      <Input
        type="text"
        {...commonProps}
        placeholder={field.placeholder}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  };

  const renderField = (field: CollectInputField) => {
    const error = errors[field.key];
    if (field.type === "repeater") {
      const value = Array.isArray(values[field.key])
        ? (values[field.key] as Array<Record<string, unknown>>)
        : [];
      const repeaterError = typeof error === "object" ? (error as RepeaterFieldError) : undefined;
      const errorMessage = typeof error === "string" ? error : repeaterError?.message;
      const rowErrors = repeaterError?.rows ?? {};
      const minItems = field.minItems ?? (field.required ? 1 : 0);
      const maxItems = field.maxItems ?? DEFAULT_MAX_REPEATER_ITEMS;
      const layout = field.ui?.layout ?? "table";
      const itemFields = Array.isArray(field.itemFields) ? field.itemFields : [];

      const handleRowChange = (rowIndex: number, key: string, nextValue: unknown) => {
        const nextRows = value.map((row, index) =>
          index === rowIndex ? { ...row, [key]: nextValue } : row
        );
        handleChange(field.key, nextRows);
      };

      return (
        <div className="space-y-3">
          {itemFields.length === 0 ? (
            <div className="text-xs text-destructive">Repeater fields require itemFields.</div>
          ) : null}
          {value.length === 0 ? (
            <div className="text-xs text-muted-foreground">No rows yet.</div>
          ) : null}
          {layout === "cards" ? (
            <div className="space-y-3">
              {value.map((row, rowIndex) => {
                const rowLabelValue = field.ui?.rowLabelKey ? row[field.ui.rowLabelKey] : undefined;
                const rowTitle =
                  rowLabelValue !== undefined && rowLabelValue !== ""
                    ? String(rowLabelValue)
                    : `Row ${rowIndex + 1}`;
                return (
                  <Card key={`repeater-${field.key}-${rowIndex}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-foreground">{rowTitle}</div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={disabled || isSubmitting || value.length <= minItems}
                          onClick={() =>
                            handleChange(
                              field.key,
                              value.filter((_, index) => index !== rowIndex)
                            )
                          }
                        >
                          {field.ui?.removeLabel || "Remove"}
                        </Button>
                      </div>
                      {itemFields.map((itemField) => {
                        const nestedError = rowErrors?.[rowIndex]?.[itemField.key];
                        return (
                          <div
                            key={`${field.key}-${rowIndex}-${itemField.key}`}
                            className="space-y-2"
                          >
                            <label
                              htmlFor={`${field.key}-${rowIndex}-${itemField.key}`}
                              className="text-sm font-medium text-foreground"
                            >
                              {itemField.label}
                              {itemField.required ? " *" : ""}
                            </label>
                            {renderInputField(
                              itemField,
                              row[itemField.key],
                              (nextValue) => handleRowChange(rowIndex, itemField.key, nextValue),
                              nestedError,
                              `${field.key}-${rowIndex}-${itemField.key}`
                            )}
                            {nestedError ? (
                              <div className="text-xs text-destructive">{nestedError}</div>
                            ) : null}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <div
                className="grid gap-2 text-xs font-medium text-muted-foreground"
                style={{
                  gridTemplateColumns: `repeat(${itemFields.length}, minmax(0, 1fr)) auto`,
                }}
              >
                {itemFields.map((itemField) => (
                  <div key={`${field.key}-header-${itemField.key}`}>{itemField.label}</div>
                ))}
                <div className="text-right"> </div>
              </div>
              {value.map((row, rowIndex) => (
                <div
                  key={`repeater-${field.key}-row-${rowIndex}`}
                  className="grid items-start gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${itemFields.length}, minmax(0, 1fr)) auto`,
                  }}
                >
                  {itemFields.map((itemField) => {
                    const nestedError = rowErrors?.[rowIndex]?.[itemField.key];
                    return (
                      <div key={`${field.key}-${rowIndex}-${itemField.key}`} className="space-y-1">
                        {renderInputField(
                          itemField,
                          row[itemField.key],
                          (nextValue) => handleRowChange(rowIndex, itemField.key, nextValue),
                          nestedError,
                          `${field.key}-${rowIndex}-${itemField.key}`
                        )}
                        {nestedError ? (
                          <div className="text-xs text-destructive">{nestedError}</div>
                        ) : null}
                      </div>
                    );
                  })}
                  <div className="flex items-start justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled || isSubmitting || value.length <= minItems}
                      onClick={() =>
                        handleChange(
                          field.key,
                          value.filter((_, index) => index !== rowIndex)
                        )
                      }
                    >
                      {field.ui?.removeLabel || "Remove"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {errorMessage ? <div className="text-xs text-destructive">{errorMessage}</div> : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled || isSubmitting || value.length >= maxItems}
            onClick={() => handleChange(field.key, [...value, buildRepeaterRow(itemFields)])}
          >
            {field.ui?.addLabel || "Add row"}
          </Button>
        </div>
      );
    }
    const errorMessage = typeof error === "string" ? error : undefined;
    return renderInputField(
      field,
      values[field.key],
      (nextValue) => handleChange(field.key, nextValue),
      errorMessage
    );
  };

  return (
    <Card className="border-border bg-muted/40">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">{request.title}</div>
          {request.description ? (
            <div className="text-xs text-muted-foreground">{request.description}</div>
          ) : null}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {fields.map((field) => {
            const fieldError = errors[field.key];
            const errorMessage = typeof fieldError === "string" ? fieldError : undefined;
            return (
              <div
                key={field.key ?? field.label ?? field.placeholder ?? Math.random()}
                className="space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <label htmlFor={field.key} className="text-sm font-medium text-foreground">
                    {field.label}
                    {field.required ? " *" : ""}
                  </label>
                  {field.helpText || field.patternLabel ? (
                    <span className="text-[11px] text-muted-foreground">
                      {field.helpText || field.patternLabel}
                    </span>
                  ) : null}
                </div>
                {renderField(field)}
                {errorMessage ? (
                  <div className="text-xs text-destructive">{errorMessage}</div>
                ) : null}
              </div>
            );
          })}
          <div className="flex gap-2">
            <Button type="submit" disabled={disabled || isSubmitting} size="sm">
              {request.submitLabel || "Submit"}
            </Button>
            {request.allowCancel !== false && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={disabled || isSubmitting}
                onClick={async () => {
                  if (onCancel) {
                    await onCancel();
                  }
                  await onSubmit({
                    values: {},
                    meta: { cancelled: true, filledAt: new Date().toISOString() },
                  });
                }}
              >
                {request.cancelLabel || "Cancel"}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
