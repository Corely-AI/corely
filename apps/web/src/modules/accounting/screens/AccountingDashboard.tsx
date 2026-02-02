import React, { type FC } from "react";
import { useNavigate } from "react-router-dom";
import { Calculator, FileText, BarChart3, Settings, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { useSetupStatus, useJournalEntries, useAccounts } from "../queries";

/**
 * Main accounting dashboard/home screen
 */
export const AccountingDashboard: FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: setupStatus, isLoading: setupLoading } = useSetupStatus();
  const { data: entriesData } = useJournalEntries({ limit: 5 });
  const { data: accountsData } = useAccounts({ limit: 5 });

  // If not set up, redirect to setup wizard
  if (!setupLoading && !setupStatus?.isSetup) {
    navigate("/accounting/setup");
    return null;
  }

  const recentEntries = entriesData?.entries || [];
  const accountCount = accountsData?.total || 0;

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("accounting.dashboard.title")}</h1>
          <p className="text-muted-foreground">{t("accounting.dashboard.subtitle")}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/accounting/journal-entries/new")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("accounting.dashboard.newEntry")}
            </CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {t("accounting.dashboard.newEntryDescription")}
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/accounting/accounts")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("accounting.dashboard.chartOfAccounts")}
            </CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountCount}</div>
            <p className="text-xs text-muted-foreground">
              {t("accounting.dashboard.activeAccounts")}
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/accounting/journal-entries")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("accounting.dashboard.journalEntries")}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entriesData?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t("accounting.dashboard.totalEntries")}
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/accounting/reports")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("accounting.dashboard.reports")}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {t("accounting.dashboard.reportsDescription")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("accounting.dashboard.recentEntries")}</CardTitle>
            <CardDescription>{t("accounting.dashboard.recentEntriesDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("accounting.dashboard.noEntries")}
              </p>
            ) : (
              <div className="space-y-3">
                {recentEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/accounting/journal-entries/${entry.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.memo}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.entryNumber || t("accounting.entryStatus.draft")} •{" "}
                        {new Date(entry.postingDate).toLocaleDateString(i18n.language)}
                      </p>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/accounting/journal-entries")}
                >
                  {t("accounting.dashboard.viewAllEntries")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("accounting.dashboard.quickLinks")}</CardTitle>
            <CardDescription>{t("accounting.dashboard.quickLinksDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/accounting/reports/trial-balance")}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {t("accounting.dashboard.viewTrialBalance")}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/accounting/reports/profit-loss")}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {t("accounting.dashboard.viewProfitLoss")}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/accounting/settings")}
            >
              <Settings className="h-4 w-4 mr-2" />
              {t("accounting.dashboard.settings")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
