import React from "react";
import { useTranslation } from "react-i18next";

export const TaxDocumentsPage = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">{t("tax.documents.title")}</h1>
        <p className="text-muted-foreground">{t("tax.documents.subtitle")}</p>
      </div>
      <div>{t("common.comingSoon")}...</div>
    </div>
  );
};
