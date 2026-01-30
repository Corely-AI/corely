import React from "react";
import { Link } from "react-router-dom";
import { type TaxFilingSummary, type TaxMode } from "@corely/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/components/Skeleton";
import { Badge } from "@/shared/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { CalendarDays, FileText, ArrowRight } from "lucide-react";

interface AnnualFilingsPanelProps {
  items: TaxFilingSummary[];
  year: number; // The selected annual year
  mode: TaxMode;
  isLoading: boolean;
  onYearChange: (year: number) => void;
}

export const AnnualFilingsPanel = ({
  items,
  year,
  mode,
  isLoading,
  onYearChange,
}: AnnualFilingsPanelProps) => {
  const title = mode === "COMPANY" ? "Year-end & Annual Filings" : "Annual Filings";
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i); // [2026, 2025, 2024, 2023, 2022, 2021]

  const isLastYear = year === currentYear - 1;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const Header = () => (
    <div className="flex items-center justify-between pb-2 border-b mb-2">
      <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
        <SelectTrigger className="w-[120px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="link" className="h-auto p-0 text-xs" asChild>
        <Link to={`/tax/filings?group=annual&year=${year}`}>View all</Link>
      </Button>
    </div>
  );

  const CreateCTA = () => (
    <div className="flex gap-2 justify-center w-full">
      <Button variant="outline" size="sm" asChild>
        <Link to={`/tax/filings/new?group=annual&year=${year}&from=tax-center`}>
          Create for {year}
        </Link>
      </Button>
    </div>
  );

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Header />
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
            <div className="bg-muted p-3 rounded-full">
              <CalendarDays className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">No annual filings for {year}</p>
              <p className="text-sm text-muted-foreground">Annual obligations.</p>
            </div>
            <CreateCTA />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Header />
        <div className="divide-y mb-4">
          {items.map((filing) => (
            <div
              key={filing.id}
              className="flex items-center justify-between py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {filing.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Due {new Date(filing.dueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] uppercase">
                  {filing.status.replace(/_/g, " ")}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link to={`/tax/filings/${filing.id}`}>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
        <CreateCTA />
      </CardContent>
    </Card>
  );
};
