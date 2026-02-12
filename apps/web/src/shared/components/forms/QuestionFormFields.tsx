import React from "react";
import { type CollectInputField, type CollectRepeaterField } from "@corely/contracts";
import {
  Button,
  Checkbox,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@corely/ui";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { type TFunction } from "i18next";

// We'll import these from the main component or helpers
export interface QuestionFormFieldsProps {
  t: TFunction;
  disabled?: boolean;
  isSubmitting: boolean;
  values: Record<string, unknown>;
  errors: Record<string, string | any>;
  handleChange: (key: string, value: unknown) => void;
  renderInputField: (
    field: CollectInputField,
    value: unknown,
    onChange: (nextValue: unknown) => void,
    error?: string,
    fieldId?: string
  ) => React.ReactNode;
}

export const EMPTY_SELECT_VALUE = "__empty__";
export const DEFAULT_MAX_REPEATER_ITEMS = 50;

export const pad2 = (value: number) => String(value).padStart(2, "0");

export const formatDateValue = (date?: Date) => {
  if (!date) {
    return "";
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

export const parseDateValue = (value?: string) => {
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

export const splitDateTimeValue = (value?: string) => {
  if (!value) {
    return { datePart: "", timePart: "" };
  }
  const [datePart = "", timePart = ""] = value.split("T");
  return { datePart, timePart: timePart.slice(0, 5) };
};

export const buildRepeaterRow = (
  itemFields: CollectInputField[],
  getEmptyValue: (f: CollectInputField) => any
) => Object.fromEntries(itemFields.map((item) => [item.key, getEmptyValue(item)]));

export const renderInputFieldHelper = (
  field: CollectInputField,
  value: unknown,
  onChange: (nextValue: unknown) => void,
  t: TFunction,
  disabled?: boolean,
  isSubmitting?: boolean,
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
              {displayDate || field.placeholder || t("common.selectDate")}
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
              {displayDate || field.placeholder || t("common.selectDate")}
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
          <SelectValue placeholder={field.placeholder || t("common.select")} />
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

export const renderInputField = renderInputFieldHelper;

export const renderFieldHelper = (
  field: CollectInputField,
  values: Record<string, unknown>,
  errors: Record<string, any>,
  handleChange: (key: string, value: unknown) => void,
  t: TFunction,
  disabled: boolean,
  isSubmitting: boolean,
  getEmptyValue: (f: CollectInputField) => any
) => {
  const error = errors[field.key];
  if (field.type === "repeater") {
    const value = Array.isArray(values[field.key])
      ? (values[field.key] as Array<Record<string, unknown>>)
      : [];
    const repeaterError = typeof error === "object" ? (error as any) : undefined;
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
          <div className="text-xs text-destructive">{t("forms.repeater.missingItemFields")}</div>
        ) : null}
        {value.length === 0 ? (
          <div className="text-xs text-muted-foreground">{t("forms.repeater.empty")}</div>
        ) : null}
        {layout === "cards" ? (
          <div className="space-y-3">
            {value.map((row, rowIndex) => {
              const rowLabelValue = field.ui?.rowLabelKey ? row[field.ui.rowLabelKey] : undefined;
              const rowTitle =
                rowLabelValue !== undefined && rowLabelValue !== ""
                  ? String(rowLabelValue)
                  : t("forms.repeater.row", { index: rowIndex + 1 });
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
                        {field.ui?.removeLabel || t("forms.repeater.remove")}
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
                            t,
                            disabled,
                            isSubmitting,
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
                        t,
                        disabled,
                        isSubmitting,
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
                    {field.ui?.removeLabel || t("forms.repeater.remove")}
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
          onClick={() =>
            handleChange(field.key, [...value, buildRepeaterRow(itemFields, getEmptyValue)])
          }
        >
          {field.ui?.addLabel || t("forms.repeater.add")}
        </Button>
      </div>
    );
  }
  const errorMessage = typeof error === "string" ? error : undefined;
  return renderInputField(
    field,
    values[field.key],
    (nextValue) => handleChange(field.key, nextValue),
    t,
    disabled,
    isSubmitting,
    errorMessage
  );
};
