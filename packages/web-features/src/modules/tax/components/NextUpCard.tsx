import React from "react";
import { Link } from "react-router-dom";
import { type TaxFilingSummary } from "@corely/contracts";
import { Button } from "@corely/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Loader2, ArrowRight, FileText, CheckCircle2 } from "lucide-react";

interface NextUpCardProps {
  filing: TaxFilingSummary | null | undefined;
  isLoading: boolean;
}

export const NextUpCard = ({ filing, isLoading }: NextUpCardProps) => {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Next Up</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[120px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!filing) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Next Up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center h-[120px] text-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mb-2 text-green-500" />
            <p>You're all caught up!</p>
            <p className="text-sm">No upcoming filings found.</p>
          </div>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/tax/filings/new">
              <FileText className="mr-2 h-4 w-4" />
              Create filing
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isOverdue =
    filing.status === "needsFix" ||
    (filing.status !== "paid" && new Date(filing.dueDate) < new Date());

  return (
    <Card className="h-full border-l-4 border-l-primary/40 relative overflow-hidden">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>
            {filing.periodLabel} {filing.type === "vat" ? "VAT" : "Tax"}
          </CardTitle>
          {isOverdue && (
            <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded">
              OVERDUE
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm text-muted-foreground">Due Date</div>
          <div className={`font-semibold text-lg ${isOverdue ? "text-destructive" : ""}`}>
            {new Date(filing.dueDate).toLocaleDateString()}
          </div>
        </div>

        {filing.amountCents !== null && (
          <div>
            <div className="text-sm text-muted-foreground">Estimated Amount</div>
            <div className="font-semibold text-lg">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: filing.currency,
              }).format(filing.amountCents / 100)}
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button className="w-full" asChild>
            <Link to={`/tax/filings/${filing.id}`}>
              Review filing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="text-center">
          <Link to="/tax/filings" className="text-xs text-muted-foreground hover:underline">
            View all filings
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
