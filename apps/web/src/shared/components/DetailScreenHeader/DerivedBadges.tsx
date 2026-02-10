import React from "react";
import { Badge } from "@corely/ui";
import { useTranslation } from "react-i18next";

type RecordBadge = {
  key?: string;
  label?: string;
  tone?: string;
};

const BADGE_TONE_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  warning: "destructive",
  info: "secondary",
  success: "default",
  muted: "outline",
};

interface DerivedBadgesProps {
  badges?: RecordBadge[];
}

export function DerivedBadges({ badges }: DerivedBadgesProps) {
  const { t } = useTranslation();
  if (!badges?.length) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      {badges.map((badge, index) => (
        <Badge
          key={badge.key ?? badge.label ?? index}
          variant={BADGE_TONE_VARIANTS[badge.tone ?? "muted"] || "outline"}
          className="text-xs"
        >
          {badge.label ?? t("common.badge")}
        </Badge>
      ))}
    </div>
  );
}
