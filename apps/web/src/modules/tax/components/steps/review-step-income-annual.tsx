import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/ui/accordion";
import { Badge } from "@/shared/ui/badge";
import { formatMoney, formatDateTime } from "@/shared/lib/formatters";
import type { IncomeTaxTotals, TaxIssue } from "@corely/contracts";
import { Link } from "react-router-dom";
import { FilingItemsList } from "../filing-items-list";

type ReviewStepIncomeAnnualProps = {
  filingId: string;
  totals?: IncomeTaxTotals;
  issues: TaxIssue[];
  currency?: string;
  onRecalculate: () => void;
  isRecalculating?: boolean;
};

export function ReviewStepIncomeAnnual({
  filingId,
  totals,
  issues,
  currency,
  onRecalculate,
  isRecalculating,
}: ReviewStepIncomeAnnualProps) {
  const formatOrPlaceholder = (value: number | null | undefined) =>
    value == null ? "Not available yet" : formatMoney(value, "en-US", currency ?? "EUR");

  const defaultIssues: TaxIssue[] = [
    {
      id: "issue-uncategorized-expenses",
      type: "uncategorized-expenses",
      severity: "warning",
      title: "Uncategorized expenses",
      count: 0,
      description: "Expenses without a category will be excluded from deductions.",
      deepLink: "/expenses?filter=uncategorized",
    },
    {
      id: "issue-missing-tax-mapping",
      type: "missing-tax-mapping",
      severity: "warning",
      title: "Missing category/tax mapping",
      count: 0,
      description: "Some entries are missing a tax treatment mapping.",
      deepLink: "/expenses?filter=missing-tax-mapping",
    },
    {
      id: "issue-unmatched-transactions",
      type: "unmatched-transactions",
      severity: "warning",
      title: "Unmatched bank transactions",
      count: 0,
      description: "Match transactions to invoices or expenses to complete your filing.",
      deepLink: "/cash-management/transactions?filter=unmatched",
    },
    {
      id: "issue-missing-invoice-link",
      type: "missing-invoice-link",
      severity: "warning",
      title: "Missing invoice links",
      count: 0,
      description: "Income items without invoice links may be incomplete.",
      deepLink: "/invoices?filter=missing-link",
    },
  ];

  const issueList = issues.length > 0 ? issues : defaultIssues;
  const blockers = issueList.filter((issue) => issue.severity === "blocker");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Summary totals</CardTitle>
          <Button variant="outline" onClick={onRecalculate} disabled={isRecalculating}>
            Recalculate
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Gross income</p>
            <p className="text-lg font-semibold">{formatOrPlaceholder(totals?.grossIncomeCents)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Deductible expenses</p>
            <p className="text-lg font-semibold">
              {formatOrPlaceholder(totals?.deductibleExpensesCents)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Net profit</p>
            <p className="text-lg font-semibold">{formatOrPlaceholder(totals?.netProfitCents)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Estimated tax due</p>
            <p className="text-lg font-semibold">
              {formatOrPlaceholder(totals?.estimatedTaxDueCents)}
            </p>
          </div>
          <div className="md:col-span-4 text-xs text-muted-foreground">
            Last recalculated{" "}
            {totals?.lastRecalculatedAt ? formatDateTime(totals.lastRecalculatedAt, "en-US") : "—"}
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="income-sources">
          <AccordionTrigger>Income sources included</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-sm text-muted-foreground pb-2">
              Review the invoices included in this filing.
            </p>
            <FilingItemsList filingId={filingId} sourceType="income" />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="expenses">
          <AccordionTrigger>Expenses included</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-sm text-muted-foreground pb-2">
              Review deductible expenses and receipts.
            </p>
            <FilingItemsList filingId={filingId} sourceType="expense" />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="adjustments">
          <AccordionTrigger>Adjustments (manual)</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">
            Adjustments are coming soon. You can still review your totals above.
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Issues to fix</CardTitle>
          {blockers.length > 0 ? (
            <Badge variant="destructive">{blockers.length} blocker(s)</Badge>
          ) : (
            <Badge variant="muted">No blockers</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {issueList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No issues detected.</p>
          ) : (
            issueList.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {issue.title}{" "}
                    {typeof issue.count === "number" ? (
                      <span className="text-xs text-muted-foreground">({issue.count})</span>
                    ) : null}
                  </p>
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
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
