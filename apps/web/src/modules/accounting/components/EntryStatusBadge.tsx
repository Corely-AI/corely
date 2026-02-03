import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@corely/ui";
import type { EntryStatus } from "@corely/contracts";

interface EntryStatusBadgeProps {
  status: EntryStatus;
}

const statusConfig: Record<EntryStatus, { className: string }> = {
  Draft: {
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  },
  Posted: {
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  Reversed: {
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
};

/**
 * Badge showing journal entry status with appropriate color coding
 */
export const EntryStatusBadge: FC<EntryStatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation();
  const config = statusConfig[status];
  return (
    <Badge variant="secondary" className={config.className}>
      {t(`accounting.entryStatus.${status.toLowerCase()}`)}
    </Badge>
  );
};
