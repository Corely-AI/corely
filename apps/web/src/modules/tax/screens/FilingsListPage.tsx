import React from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { taxApi } from "@/lib/tax-api";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { VatPeriodNavigator } from "../components/VatPeriodNavigator";
import { Badge } from "@/shared/ui/badge";

export const FilingsListPage = () => {
  const { activeWorkspace } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();

  // State from URL
  const currentTab = searchParams.get("tab") || "all";
  const currentYear = Number(searchParams.get("year")) || new Date().getFullYear();
  const currentPeriodKey = searchParams.get("periodKey") || undefined;

  // Handlers
  const handleTabChange = (val: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", val);
      // Clear specific filters when switching tabs if needed
      if (val !== "vat") {
        next.delete("periodKey");
      }
      return next;
    });
  };

  const handleYearChange = (year: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("year", String(year));
      // When year changes, clear periodKey? Navigator might re-select default
      next.delete("periodKey");
      return next;
    });
  };

  const handlePeriodChange = (key: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("periodKey", key);
      return next;
    });
  };

  // Queries
  const { data: filingsData, isLoading } = useQuery({
    queryKey: [
      "tax-filings",
      activeWorkspace?.legalEntityId,
      currentTab,
      currentYear,
      currentPeriodKey,
    ],
    queryFn: () =>
      taxApi.listFilings({
        entityId: activeWorkspace?.legalEntityId,
        year: currentTab === "all" ? currentYear : currentTab === "vat" ? currentYear : undefined, // For All, filter by year? Usually yes.
        type: currentTab === "vat" ? "VAT" : currentTab === "income" ? "INCOME_TAX" : undefined,
        periodKey: currentTab === "vat" ? currentPeriodKey : undefined,
      }),
    enabled: !!activeWorkspace,
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Filings</h1>
        <p className="text-muted-foreground">All tax filings and reports.</p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Filings</TabsTrigger>
          <TabsTrigger value="vat">VAT</TabsTrigger>
          <TabsTrigger value="income">Income Tax</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>

        <TabsContent value="vat" className="mt-6 space-y-6">
          <VatPeriodNavigator
            year={currentYear}
            onYearChange={handleYearChange}
            selectedPeriodKey={currentPeriodKey}
            onSelectPeriod={handlePeriodChange}
            entityId={activeWorkspace?.legalEntityId}
          />
        </TabsContent>
        {/* Other tabs just show table below */}
      </Tabs>

      {isLoading && <div>Loading...</div>}

      {!isLoading && filingsData && (
        <div className="border rounded bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filingsData.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    {currentTab === "vat" && currentPeriodKey
                      ? "No filing found for this period. Use the creator above."
                      : "No filings found matching your criteria."}
                  </td>
                </tr>
              ) : (
                filingsData.items.map((filing) => (
                  <tr key={filing.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {filing.type.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {filing.periodLabel}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(filing.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={
                          (filing.status as string) === "SUBMITTED"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : (filing.status as string) === "OVERDUE"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                        }
                      >
                        {filing.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/tax/filings/${filing.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
