import React from "react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@corely/ui";
import { Alert, AlertDescription, AlertTitle } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Button } from "@corely/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { formatDateTime, formatMoney } from "@corely/web-shared/shared/lib/formatters";
import type { TaxFilingTotals, TaxIssue } from "@corely/contracts";

type ReviewStepProps = {
  totals?: TaxFilingTotals;
  issues: TaxIssue[];
  currency?: string;
  onRecalculate: () => void;
  isRecalculating?: boolean;
  onViewIncludedItems: (sourceType: "invoice" | "expense") => void;
};

const DEFAULT_ISSUES: TaxIssue[] = [
  {
    id: "tax-issue-uncategorized",
    type: "uncategorized-expenses",
    severity: "blocker",
    title: "Uncategorized expenses",
    count: 0,
    description: "Expenses without categories can block filing accuracy.",
    deepLink:
      "/expenses?filters=%5B%7B%22field%22%3A%22category%22%2C%22operator%22%3A%22isNull%22%7D%5D",
  },
  {
    id: "tax-issue-missing-vat-treatment",
    type: "missing-vat-treatment",
    severity: "blocker",
    title: "Missing VAT treatment / tax code",
    count: 0,
    description: "Some records are missing VAT treatment and need review.",
    deepLink:
      "/invoices?filters=%5B%7B%22field%22%3A%22taxTreatment%22%2C%22operator%22%3A%22isNull%22%7D%5D",
  },
  {
    id: "tax-issue-unmatched-transactions",
    type: "unmatched-transactions",
    severity: "warning",
    title: "Unmatched transactions",
    count: 0,
    description: "Unmatched transactions should be reconciled before submission.",
    deepLink:
      "/cash-management/transactions?filters=%5B%7B%22field%22%3A%22matchStatus%22%2C%22operator%22%3A%22eq%22%2C%22value%22%3A%22unmatched%22%7D%5D",
  },
  {
    id: "tax-issue-negative-vat",
    type: "suspicious-negative-vat",
    severity: "warning",
    title: "Suspicious negative VAT check",
    count: 0,
    description: "A negative VAT balance was detected and should be reviewed.",
    deepLink: "/tax/filings?status=needsFix",
  },
];

const SEVERITY_LABELS: Record<TaxIssue["severity"], string> = {
  blocker: "Blocker",
  warning: "Warning",
  info: "Info",
};

const SEVERITY_VARIANTS: Record<TaxIssue["severity"], "destructive" | "outline" | "secondary"> = {
  blocker: "destructive",
  warning: "outline",
  info: "secondary",
};

export function ReviewStep({
  totals,
  issues,
  currency,
  onRecalculate,
  isRecalculating,
  onViewIncludedItems,
}: ReviewStepProps) {
  const issueList = issues.length > 0 ? issues : DEFAULT_ISSUES;
  const blockerCount = issueList.filter((issue) => issue.severity === "blocker").length;
  const formatAmount = (value: number | null | undefined) =>
    value == null ? "—" : formatMoney(value, "en-US", currency ?? "EUR");

  return (
    <div className="space-y-6" data-testid="tax-filing-review-step">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Summary totals</CardTitle>
          <Button variant="outline" onClick={onRecalculate} disabled={isRecalculating}>
            Recalculate
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">VAT collected</p>
            <p className="text-lg font-semibold">{formatAmount(totals?.vatCollectedCents)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">VAT paid</p>
            <p className="text-lg font-semibold">{formatAmount(totals?.vatPaidCents)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Payable / receivable</p>
            <p className="text-lg font-semibold">{formatAmount(totals?.netPayableCents)}</p>
          </div>
          <div className="md:col-span-3 text-xs text-muted-foreground">
            Last recalculated{" "}
            {totals?.lastRecalculatedAt ? formatDateTime(totals.lastRecalculatedAt, "en-US") : "—"}
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="sales">
          <AccordionTrigger>Sales / invoices included</AccordionTrigger>
          <AccordionContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {totals?.salesCount ?? 0} invoice item(s) • Net {formatAmount(totals?.salesNetCents)}
            </p>
            <Button variant="outline" onClick={() => onViewIncludedItems("invoice")}>
              View included items
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="purchases">
          <AccordionTrigger>Purchases / expenses included</AccordionTrigger>
          <AccordionContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {totals?.purchaseCount ?? 0} expense item(s) • Net{" "}
              {formatAmount(totals?.purchaseNetCents)}
            </p>
            <Button variant="outline" onClick={() => onViewIncludedItems("expense")}>
              View included items
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="adjustments">
          <AccordionTrigger>Adjustments (manual)</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">
            Adjustments are coming soon.
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {blockerCount > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Resolve blockers to submit</AlertTitle>
          <AlertDescription>
            {blockerCount} blocker issue{blockerCount === 1 ? "" : "s"} must be fixed before
            submission.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Issues to fix</CardTitle>
          <Badge variant={blockerCount > 0 ? "destructive" : "secondary"}>
            {blockerCount > 0 ? `${blockerCount} blocker(s)` : "No blockers"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {issueList.map((issue) => (
            <div
              key={issue.id}
              className="flex items-start justify-between gap-4 rounded-md border border-border p-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {issue.title}
                    {typeof issue.count === "number" ? ` (${issue.count})` : ""}
                  </p>
                  <Badge variant={SEVERITY_VARIANTS[issue.severity]}>
                    {SEVERITY_LABELS[issue.severity]}
                  </Badge>
                </div>
                {issue.description ? (
                  <p className="text-xs text-muted-foreground">{issue.description}</p>
                ) : null}
              </div>

              {issue.deepLink ? (
                <Button variant="outline" asChild>
                  <Link to={issue.deepLink}>Fix</Link>
                </Button>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
