import React, { type FC } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, TrendingUp, Scale, PieChart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: typeof BarChart3;
  path: string;
}

/**
 * Reports hub showing all available financial reports
 */
export const ReportsHub: FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const reports: ReportCard[] = [
    {
      id: "trial-balance",
      title: t("accounting.reports.trialBalance.title"),
      description: t("accounting.reports.trialBalance.description"),
      icon: Scale,
      path: "/accounting/reports/trial-balance",
    },
    {
      id: "general-ledger",
      title: t("accounting.reports.generalLedger.title"),
      description: t("accounting.reports.generalLedger.description"),
      icon: BarChart3,
      path: "/accounting/reports/general-ledger",
    },
    {
      id: "profit-loss",
      title: t("accounting.reports.profitLoss.title"),
      description: t("accounting.reports.profitLoss.description"),
      icon: TrendingUp,
      path: "/accounting/reports/profit-loss",
    },
    {
      id: "balance-sheet",
      title: t("accounting.reports.balanceSheet.title"),
      description: t("accounting.reports.balanceSheet.description"),
      icon: PieChart,
      path: "/accounting/reports/balance-sheet",
    },
  ];

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("accounting.reports.title")}</h1>
        <p className="text-muted-foreground">{t("accounting.reports.subtitle")}</p>
      </div>

      {/* Report Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card
              key={report.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(report.path)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      {report.title}
                    </CardTitle>
                    <CardDescription>{report.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" onClick={() => navigate(report.path)}>
                  {t("accounting.reports.viewReport")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Section */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">{t("accounting.reports.aboutTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{t("accounting.reports.aboutLine1")}</p>
          <p>{t("accounting.reports.aboutLine2")}</p>
          <p className="text-primary font-medium">{t("accounting.reports.aboutLine3")}</p>
        </CardContent>
      </Card>
    </div>
  );
};
