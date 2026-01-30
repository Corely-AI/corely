import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { taxApi } from "@/lib/tax-api";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/components/Skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const FilingDetailPage = () => {
  const { id } = useParams();

  const { data: filing, isLoading } = useQuery({
    queryKey: ["tax-filing", id],
    queryFn: () => taxApi.getReport(id!),
    enabled: !!id,
  });

  const year = filing?.periodStart ? new Date(filing.periodStart).getFullYear() : undefined;

  // Fetch periods to determine prev/next if VAT
  const isVat = filing?.type === "VAT_ADVANCE";
  const { data: periodsData } = useQuery({
    queryKey: ["vat-periods", year],
    queryFn: () => taxApi.getVatFilingPeriods({ year: year! }),
    enabled: !!year && isVat,
  });

  if (isLoading)
    {return (
      <div className="p-6">
        <Skeleton className="h-12 w-1/3 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );}

  const isPeriodKey = /^\d{4}-Q[1-4]$/.test(id || "") || /^\d{4}-(0[1-9]|1[0-2])$/.test(id || "");

  if (!filing && isPeriodKey) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-2xl font-bold">New Filing for {id}</h1>
        <p className="text-muted-foreground">This filing period has not been started yet.</p>
        <Button asChild>
          <Link to={`/tax/filings/new?type=VAT&periodKey=${id}&year=${id?.split("-")[0]}`}>
            Start Filing
          </Link>
        </Button>
      </div>
    );
  }

  if (!filing) {return <div className="p-6">Filing not found</div>;}

  const renderPeriodNavigation = () => {
    if (!periodsData?.periods || !isVat) {return null;}

    const currentIndex = periodsData.periods.findIndex((p) => p.filingId === filing.id);
    if (currentIndex === -1) {return null;}

    const prev = periodsData.periods[currentIndex - 1];
    const next = periodsData.periods[currentIndex + 1];

    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!prev} asChild={!!prev}>
          {prev ? (
            <Link
              to={
                prev.filingId
                  ? `/tax/filings/${prev.filingId}`
                  : `/tax/filings/new?type=VAT&year=${year}&periodKey=${prev.periodKey}`
              }
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {prev.label}
            </Link>
          ) : (
            <span>
              <ChevronLeft className="h-4 w-4 mr-1" /> Prev
            </span>
          )}
        </Button>
        <Button variant="outline" size="sm" disabled={!next} asChild={!!next}>
          {next ? (
            <Link
              to={
                next.filingId
                  ? `/tax/filings/${next.filingId}`
                  : `/tax/filings/new?type=VAT&year=${year}&periodKey=${next.periodKey}`
              }
            >
              {next.label}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          ) : (
            <span>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </span>
          )}
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {filing.periodLabel} {filing.type} Filing
          </h1>
          <p className="text-muted-foreground">
            {filing.status} - Due {new Date(filing.dueDate).toLocaleDateString()}
          </p>
        </div>
        {renderPeriodNavigation()}
      </div>

      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Filing Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500 block">ID</span>
            <span className="font-mono text-sm">{filing.id}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500 block">Period</span>
            <span>
              {filing.periodLabel} ({new Date(filing.periodStart!).toLocaleDateString()} -{" "}
              {new Date(filing.periodEnd!).toLocaleDateString()})
            </span>
          </div>
          {/* Add more details as needed */}
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded border text-center text-gray-500">
          Form/Stepper Content Placeholder
        </div>
      </div>
    </div>
  );
};
