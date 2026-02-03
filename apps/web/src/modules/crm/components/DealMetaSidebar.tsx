import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Button } from "@corely/ui";
import type { DealDto } from "@corely/contracts";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface DealMetaSidebarProps {
  deal: DealDto;
}

export const DealMetaSidebar: React.FC<DealMetaSidebarProps> = ({ deal }) => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("crm.deals.relationships")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">{t("crm.deals.party")}</p>
            <p className="font-medium">{deal.partyId || "—"}</p>
          </div>
          {deal.partyId && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/customers/${deal.partyId}`}>{t("common.open")}</Link>
            </Button>
          )}
        </div>
        <div>
          <p className="text-muted-foreground">{t("crm.deals.owner")}</p>
          <p className="font-medium">{deal.ownerUserId || t("crm.deals.unassigned")}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("common.status")}</p>
          <p className="font-medium">{t(`crm.deals.statuses.${deal.status.toLowerCase()}`)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">{t("common.tags")}</p>
          {deal.tags?.length ? (
            <div className="flex flex-wrap gap-2">
              {deal.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">{t("common.noTags")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
