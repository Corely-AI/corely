import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@corely/ui";
import type { DealDto } from "@corely/contracts";
import { DealStatusBadge } from "./DealStatusBadge";

interface DealCardProps {
  deal: DealDto;
  onClick?: () => void;
}

export const DealCard: FC<DealCardProps> = ({ deal, onClick }) => {
  const { t, i18n } = useTranslation();
  const amount =
    deal.amountCents !== null
      ? new Intl.NumberFormat(i18n.language, {
          style: "currency",
          currency: deal.currency,
        }).format(deal.amountCents / 100)
      : t("crm.deals.noAmount");

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{deal.title}</CardTitle>
          <DealStatusBadge status={deal.status} />
        </div>
        <CardDescription>
          {amount} • {t("crm.deals.stage")}: {deal.stageId}
        </CardDescription>
      </CardHeader>
      {deal.notes && (
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">{deal.notes}</p>
        </CardContent>
      )}
    </Card>
  );
};
