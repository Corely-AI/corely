import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { crmApi } from "@/lib/crm-api";
import { EmptyState } from "@/shared/components/EmptyState";
import { LeadCard } from "@/modules/crm/components/LeadCard";

export default function LeadsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: leads } = useQuery({
    queryKey: ["leads"],
    queryFn: () => crmApi.listLeads(),
  });

  const leadList = leads || [];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">Leads</h1>
        <Button variant="accent" onClick={() => navigate("/crm/leads/new")}>
          <UserPlus className="h-4 w-4" />
          New Lead
        </Button>
      </div>

      {leadList.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Briefcase}
              title="No leads found"
              description="Create a new lead to get started."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leadList.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={() => navigate(`/crm/leads/${lead.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
