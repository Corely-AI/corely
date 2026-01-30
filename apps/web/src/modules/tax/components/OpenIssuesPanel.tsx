import React from "react";
import { Link } from "react-router-dom";
import { type TaxCenterIssue } from "@corely/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { badgeVariants } from "@/shared/ui/badge";

interface OpenIssuesPanelProps {
  issues: TaxCenterIssue[];
  isLoading: boolean;
}

export const OpenIssuesPanel = ({ issues, isLoading }: OpenIssuesPanelProps) => {
  if (isLoading) {
    return (
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>Open Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted/20 animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (issues.length === 0) {
    return (
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>Open Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-muted-foreground p-4 bg-muted/10 rounded-lg border border-dashed">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <span>No issues detected. Your bookkeeping looks clean!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Open Issues</CardTitle>
          <span className="text-xs text-muted-foreground">
            {issues.reduce((a, b) => a + b.count, 0)} items
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <AlertCircle
              className={`h-5 w-5 mt-0.5 ${issue.severity === "error" ? "text-destructive" : "text-yellow-500"}`}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">{issue.title}</h4>
                {issue.blocking && (
                  <span className="text-[10px] bg-destructive text-destructive-foreground px-1.5 rounded">
                    BLOCKING
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{issue.description}</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium mb-1">{issue.count} affected</div>
              <Button variant="ghost" size="sm" className="h-6 text-xs" asChild>
                <Link to={issue.deepLink}>
                  Fix <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
