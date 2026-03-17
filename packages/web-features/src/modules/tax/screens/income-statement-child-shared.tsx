import React from "react";
import type {
  ChildCareCost,
  ChildResidenceValue,
  PrivateSchoolCost,
  RelationshipValue,
  SharedHouseholdValue,
} from "@corely/contracts";
export type {
  ChildCareCost,
  ChildResidenceValue,
  PrivateSchoolCost,
  RelationshipValue,
  SharedHouseholdValue,
} from "@corely/contracts";
import { AlertCircle } from "lucide-react";
import {
  Button,
  Calendar,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@corely/ui";

export const RELATIONSHIP_OPTIONS: Array<{ value: RelationshipValue; label: string }> = [
  { value: "biological-child", label: "Biological child" },
  { value: "adopted-child", label: "Adopted child" },
  { value: "step-child", label: "Stepchild" },
  { value: "foster-child", label: "Foster child" },
  { value: "grandchild", label: "Grandchild" },
];

const formatDate = (value?: Date) => (value ? value.toLocaleDateString("de-DE") : "Select date...");

export const ChildPageSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <Card className="border-border/50 bg-card/95 shadow-sm">
    <CardContent className="space-y-6 p-6 lg:p-7">
      <div className="space-y-1.5">
        <h2 className="text-h3 text-foreground">{title}</h2>
        {description ? <p className="text-body text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </CardContent>
  </Card>
);

export const FieldGroup = ({
  id,
  label,
  children,
  helperText,
}: {
  id?: string;
  label: string;
  children: React.ReactNode;
  helperText?: React.ReactNode;
}) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-sm font-medium text-foreground">
      {label}
    </Label>
    {children}
    {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
  </div>
);

export const OutlineActionButton = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <Button
    type="button"
    variant="outline"
    className="rounded-full border-sky-500 px-6 text-sky-500 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/40"
    onClick={onClick}
  >
    {children}
  </Button>
);

export const MoneyInput = ({
  id,
  value,
  onChange,
  placeholder = "€ 0",
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) => (
  <Input
    id={id}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    className="h-10"
  />
);

export const DatePickerField = ({
  id,
  value,
  onChange,
}: {
  id: string;
  value?: Date;
  onChange: (next: Date | undefined) => void;
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        id={id}
        type="button"
        variant="outline"
        className={cn("h-10 w-full justify-start font-normal", !value && "text-muted-foreground")}
      >
        {formatDate(value)}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar mode="single" selected={value} onSelect={onChange} />
    </PopoverContent>
  </Popover>
);

type ChildCostDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  primaryLabel: string;
  primaryPlaceholder: string;
  secondaryLabel: string;
  secondaryPlaceholder: string;
  totalLabel: string;
  totalValue: string;
  primaryValue: string;
  secondaryValue: string;
  startDate?: Date;
  endDate?: Date;
  onPrimaryChange: (next: string) => void;
  onSecondaryChange: (next: string) => void;
  onStartDateChange: (next: Date | undefined) => void;
  onEndDateChange: (next: Date | undefined) => void;
  onTotalValueChange: (next: string) => void;
  onSave: () => void;
};

export const ChildCostDialog = ({
  open,
  onOpenChange,
  title,
  primaryLabel,
  primaryPlaceholder,
  secondaryLabel,
  secondaryPlaceholder,
  totalLabel,
  totalValue,
  primaryValue,
  secondaryValue,
  startDate,
  endDate,
  onPrimaryChange,
  onSecondaryChange,
  onStartDateChange,
  onEndDateChange,
  onTotalValueChange,
  onSave,
}: ChildCostDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[560px]">
      <DialogHeader>
        <DialogTitle className="text-2xl font-semibold text-foreground">{title}</DialogTitle>
      </DialogHeader>

      <div className="space-y-5">
        <FieldGroup id="child-cost-primary" label={primaryLabel}>
          <Input
            id="child-cost-primary"
            value={primaryValue}
            onChange={(event) => onPrimaryChange(event.target.value)}
            placeholder={primaryPlaceholder}
            className="h-10"
          />
        </FieldGroup>

        <FieldGroup id="child-cost-secondary" label={secondaryLabel}>
          <Input
            id="child-cost-secondary"
            value={secondaryValue}
            onChange={(event) => onSecondaryChange(event.target.value)}
            placeholder={secondaryPlaceholder}
            className="h-10"
          />
        </FieldGroup>

        <FieldGroup id="child-cost-start-date" label="Start date">
          <DatePickerField
            id="child-cost-start-date"
            value={startDate}
            onChange={onStartDateChange}
          />
        </FieldGroup>

        <FieldGroup id="child-cost-end-date" label="End date">
          <DatePickerField id="child-cost-end-date" value={endDate} onChange={onEndDateChange} />
        </FieldGroup>

        <FieldGroup id="child-cost-total" label={totalLabel}>
          <MoneyInput
            id="child-cost-total"
            value={totalValue}
            onChange={onTotalValueChange}
            placeholder="€ 0"
          />
        </FieldGroup>
      </div>

      <DialogFooter className="flex-row items-center justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          className="text-sky-600 hover:bg-transparent hover:text-sky-700"
          onClick={() => onOpenChange(false)}
        >
          Go back
        </Button>
        <Button type="button" className="rounded-full px-8" onClick={onSave}>
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const UnsupportedChildDeclarationAlert = () => (
  <div className="flex items-start gap-4 rounded-xl border border-rose-300/50 bg-rose-50 p-5 text-rose-600 dark:border-rose-500/30 dark:bg-rose-950/20 dark:text-rose-300">
    <div className="rounded-full border border-current p-2">
      <AlertCircle className="h-6 w-6" />
    </div>
    <p className="max-w-4xl text-body leading-relaxed">
      Declaring costs for your child is currently only supported through a tax consultant on Deel,
      our parent company. For more information and request tax advice please check{" "}
      <button type="button" className="text-sky-500 hover:text-sky-400">
        here
      </button>
      .
    </p>
  </div>
);

export const CostTableSection = ({
  label,
  actionLabel,
  emptyLabel,
  firstColumnLabel,
  rows,
  getRowKey,
  getPrimaryValue,
  getSecondaryValue,
  onAdd,
}: {
  label: string;
  actionLabel: string;
  emptyLabel: string;
  firstColumnLabel: string;
  rows: readonly unknown[];
  getRowKey: (row: unknown) => string;
  getPrimaryValue: (row: unknown) => React.ReactNode;
  getSecondaryValue: (row: unknown) => React.ReactNode;
  onAdd: () => void;
}) => (
  <div className="space-y-4">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <p className="text-body text-foreground">{label}</p>
      <OutlineActionButton onClick={onAdd}>{actionLabel}</OutlineActionButton>
    </div>

    <Table>
      <TableHeader>
        <TableRow className="border-border/60 bg-card/70">
          <TableHead className="font-semibold text-foreground">{firstColumnLabel}</TableHead>
          <TableHead className="w-[180px] font-semibold text-foreground">Amount</TableHead>
          <TableHead className="w-[60px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length > 0 ? (
          rows.map((row) => (
            <TableRow key={getRowKey(row)} className="border-border/60 bg-card/30">
              <TableCell className="text-body text-foreground">{getPrimaryValue(row)}</TableCell>
              <TableCell className="text-body text-foreground">{getSecondaryValue(row)}</TableCell>
              <TableCell />
            </TableRow>
          ))
        ) : (
          <TableRow className="border-border/60 bg-card/30">
            <TableCell colSpan={3} className="py-10 text-center text-body text-foreground/75">
              {emptyLabel}{" "}
              <button type="button" className="text-sky-500 hover:text-sky-400" onClick={onAdd}>
                {actionLabel}
              </button>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </div>
);
