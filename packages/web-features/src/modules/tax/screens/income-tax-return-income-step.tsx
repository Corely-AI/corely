import React from "react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@corely/ui";
import type {
  AnnualIncomeSectionPayload,
  AnnualIncomeSource,
  AnnualIncomeSourceType,
  TaxReportSectionValidationError,
} from "@corely/contracts";
import { SegmentedControl } from "./income-tax-return-shared";

type IncomeTaxReturnIncomeStepProps = {
  value: AnnualIncomeSectionPayload;
  validationErrors: TaxReportSectionValidationError[];
  onChange: (next: AnnualIncomeSectionPayload) => void;
  disabled?: boolean;
};

const SOURCE_TYPE_OPTIONS: Array<{ value: AnnualIncomeSourceType; label: string }> = [
  { value: "employment", label: "Employment" },
  { value: "self_employed", label: "Self employed" },
  { value: "freelance", label: "Freelance" },
  { value: "capital_gains", label: "Capital gains" },
  { value: "rental", label: "Rental" },
  { value: "pension", label: "Pension" },
  { value: "other", label: "Other" },
];

const buildEmptySource = (): AnnualIncomeSource => ({
  type: "employment",
  label: "",
  country: "DE",
  amounts: {
    grossIncome: 0,
  },
});

const toDecimalOrZero = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const parseAttachmentInput = (value: string): string[] =>
  value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

const formatAttachmentInput = (source: AnnualIncomeSource): string =>
  source.attachments?.documentIds.join(", ") ?? "";

const ErrorHint = ({ message }: { message?: string }) =>
  message ? <p className="text-xs text-rose-600">{message}</p> : null;

export const IncomeTaxReturnIncomeStep = ({
  value,
  validationErrors,
  onChange,
  disabled,
}: IncomeTaxReturnIncomeStepProps) => {
  const findError = React.useCallback(
    (path: string) => validationErrors.find((error) => error.path === path)?.message,
    [validationErrors]
  );

  const replaceSource = (
    index: number,
    updater: (current: AnnualIncomeSource) => AnnualIncomeSource
  ) => {
    const nextSources = value.incomeSources.map((source, sourceIndex) =>
      sourceIndex === index ? updater(source) : source
    );
    onChange({
      ...value,
      incomeSources: nextSources,
    });
  };

  const addSource = () => {
    onChange({
      ...value,
      noIncomeFlag: false,
      incomeSources: [...value.incomeSources, buildEmptySource()],
    });
  };

  const removeSource = (index: number) => {
    onChange({
      ...value,
      incomeSources: value.incomeSources.filter((_, sourceIndex) => sourceIndex !== index),
    });
  };

  const setNoIncomeFlag = (next: boolean) => {
    onChange({
      ...value,
      noIncomeFlag: next,
      incomeSources: next ? [] : value.incomeSources,
    });
  };

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div className="space-y-2">
          <h2 className="text-h3 text-foreground">Annual income</h2>
          <p className="text-body-sm text-muted-foreground">
            Add all income sources that belong to this annual declaration.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            No taxable income in this year
          </Label>
          <SegmentedControl
            ariaLabel="No income flag"
            value={value.noIncomeFlag ? "yes" : "no"}
            onChange={(next) => setNoIncomeFlag(next === "yes")}
            options={[
              { value: "no", label: "No" },
              { value: "yes", label: "Yes" },
            ]}
          />
          <ErrorHint message={findError("incomeSources")} />
        </div>

        {value.noIncomeFlag ? null : (
          <div className="space-y-4">
            {value.incomeSources.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                No income source added yet.
              </div>
            ) : null}

            {value.incomeSources.map((source, index) => (
              <div
                key={`income-source-${index}`}
                className="space-y-4 rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Income source {index + 1}
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSource(index)}
                    disabled={disabled}
                  >
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={source.type}
                      onValueChange={(next) =>
                        replaceSource(index, (current) => ({
                          ...current,
                          type: next as AnnualIncomeSourceType,
                        }))
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ErrorHint message={findError(`incomeSources.${index}.type`)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      value={source.label}
                      onChange={(event) =>
                        replaceSource(index, (current) => ({
                          ...current,
                          label: event.target.value,
                        }))
                      }
                      disabled={disabled}
                    />
                    <ErrorHint message={findError(`incomeSources.${index}.label`)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Payer / Employer</Label>
                    <Input
                      value={source.payer ?? ""}
                      onChange={(event) =>
                        replaceSource(index, (current) => ({
                          ...current,
                          payer:
                            event.target.value.trim().length > 0 ? event.target.value : undefined,
                        }))
                      }
                      disabled={disabled}
                    />
                    <ErrorHint message={findError(`incomeSources.${index}.payer`)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      maxLength={2}
                      value={source.country ?? "DE"}
                      onChange={(event) =>
                        replaceSource(index, (current) => ({
                          ...current,
                          country: event.target.value.toUpperCase(),
                        }))
                      }
                      disabled={disabled}
                    />
                    <ErrorHint message={findError(`incomeSources.${index}.country`)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Gross income</Label>
                    <Input
                      type="number"
                      min={0}
                      value={source.amounts.grossIncome}
                      onChange={(event) =>
                        replaceSource(index, (current) => ({
                          ...current,
                          amounts: {
                            ...current.amounts,
                            grossIncome: toDecimalOrZero(event.target.value),
                          },
                        }))
                      }
                      disabled={disabled}
                    />
                    <ErrorHint message={findError(`incomeSources.${index}.amounts.grossIncome`)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Taxes withheld</Label>
                    <Input
                      type="number"
                      min={0}
                      value={source.amounts.taxesWithheld ?? ""}
                      onChange={(event) =>
                        replaceSource(index, (current) => ({
                          ...current,
                          amounts: {
                            ...current.amounts,
                            taxesWithheld:
                              event.target.value === ""
                                ? undefined
                                : toDecimalOrZero(event.target.value),
                          },
                        }))
                      }
                      disabled={disabled}
                    />
                    <ErrorHint
                      message={findError(`incomeSources.${index}.amounts.taxesWithheld`)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Social contributions</Label>
                    <Input
                      type="number"
                      min={0}
                      value={source.amounts.socialContributions ?? ""}
                      onChange={(event) =>
                        replaceSource(index, (current) => ({
                          ...current,
                          amounts: {
                            ...current.amounts,
                            socialContributions:
                              event.target.value === ""
                                ? undefined
                                : toDecimalOrZero(event.target.value),
                          },
                        }))
                      }
                      disabled={disabled}
                    />
                    <ErrorHint
                      message={findError(`incomeSources.${index}.amounts.socialContributions`)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Expenses related</Label>
                    <Input
                      type="number"
                      min={0}
                      value={source.amounts.expensesRelated ?? ""}
                      onChange={(event) =>
                        replaceSource(index, (current) => ({
                          ...current,
                          amounts: {
                            ...current.amounts,
                            expensesRelated:
                              event.target.value === ""
                                ? undefined
                                : toDecimalOrZero(event.target.value),
                          },
                        }))
                      }
                      disabled={disabled}
                    />
                    <ErrorHint
                      message={findError(`incomeSources.${index}.amounts.expensesRelated`)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Start date</Label>
                    <Input
                      type="date"
                      value={source.period?.startDate ?? ""}
                      onChange={(event) =>
                        replaceSource(index, (current) => ({
                          ...current,
                          period:
                            event.target.value || current.period?.endDate
                              ? {
                                  startDate: event.target.value || undefined,
                                  endDate: current.period?.endDate,
                                }
                              : undefined,
                        }))
                      }
                      disabled={disabled}
                    />
                    <ErrorHint message={findError(`incomeSources.${index}.period.startDate`)} />
                  </div>

                  <div className="space-y-2">
                    <Label>End date</Label>
                    <Input
                      type="date"
                      value={source.period?.endDate ?? ""}
                      onChange={(event) =>
                        replaceSource(index, (current) => ({
                          ...current,
                          period:
                            current.period?.startDate || event.target.value
                              ? {
                                  startDate: current.period?.startDate,
                                  endDate: event.target.value || undefined,
                                }
                              : undefined,
                        }))
                      }
                      disabled={disabled}
                    />
                    <ErrorHint message={findError(`incomeSources.${index}.period.endDate`)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Attachment document IDs (comma-separated)</Label>
                  <Input
                    value={formatAttachmentInput(source)}
                    onChange={(event) =>
                      replaceSource(index, (current) => ({
                        ...current,
                        attachments:
                          event.target.value.trim().length > 0
                            ? {
                                documentIds: parseAttachmentInput(event.target.value),
                              }
                            : undefined,
                      }))
                    }
                    disabled={disabled}
                  />
                  <ErrorHint
                    message={findError(`incomeSources.${index}.attachments.documentIds`)}
                  />
                </div>
              </div>
            ))}

            <Button type="button" onClick={addSource} variant="outline" disabled={disabled}>
              Add income source
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
