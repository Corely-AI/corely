import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { useTaxMode } from "../hooks/useTaxMode";
import { useTaxCenterQuery } from "../hooks/useTaxCenterQuery";
import { NextUpCard } from "../components/NextUpCard";
import { OpenIssuesPanel } from "../components/OpenIssuesPanel";
import { SnapshotKPIs } from "../components/SnapshotKPIs";
import { ShortcutsCard } from "../components/ShortcutsCard";
import { Button } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { Alert, AlertDescription, AlertTitle } from "@corely/ui";

import { AnnualFilingsPanel } from "../components/AnnualFilingsPanel";

export const TaxCenterPage = () => {
  const { activeWorkspace } = useWorkspace();
  const { isFreelancer, mode } = useTaxMode();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [annualYear, setAnnualYear] = useState<number>(currentYear - 1); // Default to last year

  const { data, isLoading, isError, refetch } = useTaxCenterQuery(
    {
      entityId: activeWorkspace?.legalEntityId,
      year,
      annualYear,
    },
    !!activeWorkspace
  );

  if (isError) {
    return (
      <div className="p-8 space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Error loading Tax Center</AlertTitle>
          <AlertDescription>We couldn't load your tax overview. Please try again.</AlertDescription>
        </Alert>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isFreelancer ? "My Taxes" : "Tax Center"}
          </h1>
          <p className="text-muted-foreground">
            {isFreelancer
              ? "Manage your freelancer tax obligations."
              : "Overview of company tax compliance and filings."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(new Date().getFullYear())}>
                {new Date().getFullYear()}
              </SelectItem>
              <SelectItem value={String(new Date().getFullYear() - 1)}>
                {new Date().getFullYear() - 1}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button asChild>
            <Link to="/tax/filings">Review next filing</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/tax/settings">Settings</Link>
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Next Up & Annual & Shortcuts */}
        <div className="space-y-6">
          <div className="h-auto">
            <NextUpCard filing={data?.nextUp} isLoading={isLoading} />
          </div>

          <AnnualFilingsPanel
            items={data?.annual?.items ?? []}
            year={annualYear}
            mode={mode}
            isLoading={isLoading}
            onYearChange={setAnnualYear}
          />

          <ShortcutsCard />
        </div>

        {/* Column 2 & 3: Issues & Snapshot */}
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <OpenIssuesPanel issues={data?.issues ?? []} isLoading={isLoading} />
          </div>
          <SnapshotKPIs snapshot={data?.snapshot} isLoading={isLoading} year={year} />
        </div>
      </div>
    </div>
  );
};
