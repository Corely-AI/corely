import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@corely/ui";
import type { DealStatus } from "@corely/contracts";

interface DealStatusBadgeProps {
  status: DealStatus;
}

const statusColors: Record<DealStatus, string> = {
  OPEN: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  WON: "bg-green-100 text-green-800 hover:bg-green-100",
  LOST: "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

export const DealStatusBadge: FC<DealStatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation();
  return (
    <Badge variant="secondary" className={statusColors[status]}>
      {t(`crm.deals.status.${status.toLowerCase()}`)}
    </Badge>
  );
};
