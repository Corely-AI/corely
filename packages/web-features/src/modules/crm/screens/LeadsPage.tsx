import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@corely/ui";
import { LoadingSkeleton, Button } from "@corely/ui";
import { crmApi } from "@corely/web-shared/lib/crm-api";
import { EmptyState } from "@corely/web-shared/shared/components/EmptyState";
import { LeadCard } from "../components/LeadCard";

export default function LeadsPage() {
  const uiCopy = useUiCopy("ui.crm-leadspage");
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    data: leads,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["leads"],
    queryFn: () => crmApi.listLeads(),
  });

  const leadList = leads || [];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="crm-leads-page">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground" data-testid="crm-leads-header">
          {uiCopy("leads")}
        </h1>
        <Button
          variant="accent"
          onClick={() => navigate("/crm/leads/new")}
          data-testid="crm-leads-create"
        >
          <UserPlus className="h-4 w-4" />
          {uiCopy("new-lead")}
        </Button>
      </div>

      {isLoading ? (
        <LoadingSkeleton variant="cards" label={t("common.loading")} />
      ) : isError && !leads ? (
        <p className="p-4 text-sm text-destructive" role="alert">
          {t("common.error")}
        </p>
      ) : leadList.length === 0 ? (
        <Card data-testid="crm-leads-empty">
          <CardContent className="p-0">
            <EmptyState
              icon={Briefcase}
              title={uiCopy("no-leads-found")}
              description={uiCopy("create-a-new-lead")}
            />
          </CardContent>
        </Card>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="crm-leads-list"
        >
          {leadList.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={() => navigate(`/crm/leads/${lead.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
