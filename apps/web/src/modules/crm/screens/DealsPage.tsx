import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { crmApi } from "@/lib/crm-api";
import { EmptyState } from "@/shared/components/EmptyState";
import { DealCard } from "../components/DealCard";

export default function DealsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: dealsData } = useQuery({
    queryKey: ["deals"],
    queryFn: () => crmApi.listDeals(),
  });

  const deals = dealsData?.deals || [];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">{t("crm.deals.title")}</h1>
        <Button variant="accent" onClick={() => navigate("/crm/deals/new")}>
          <Plus className="h-4 w-4" />
          {t("crm.deals.new")}
        </Button>
      </div>

      {deals.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Briefcase}
              title={t("crm.deals.emptyTitle")}
              description={t("crm.deals.emptyDescription")}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onClick={() => navigate(`/crm/deals/${deal.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
