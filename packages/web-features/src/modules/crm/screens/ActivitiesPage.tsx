import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { crmApi } from "@corely/web-shared/lib/crm-api";
import { EmptyState } from "@corely/web-shared/shared/components/EmptyState";
import { ActivityCard } from "../components/ActivityCard";

export default function ActivitiesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: activitiesData } = useQuery({
    queryKey: ["activities"],
    queryFn: () => crmApi.listActivities(),
  });

  const activities = activitiesData?.activities || [];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="crm-activities-page">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground" data-testid="crm-activities-header">
          {t("crm.activities.title")}
        </h1>
        <Button
          variant="accent"
          onClick={() => navigate("/crm/activities/new")}
          data-testid="crm-activities-create"
        >
          <Plus className="h-4 w-4" />
          {t("crm.activities.new")}
        </Button>
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={CheckSquare}
              title={t("crm.activities.emptyTitle")}
              description={t("crm.activities.emptyDescription")}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
}
