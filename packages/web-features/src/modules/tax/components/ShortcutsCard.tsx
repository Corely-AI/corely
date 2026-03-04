import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Button } from "@corely/ui";
import { Plus, Download, CreditCard, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

export const ShortcutsCard = () => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tax.center.shortcuts.title")}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-2 justify-center"
          asChild
        >
          <Link to="/tax/filings/new">
            <Plus className="h-5 w-5" />
            <span className="text-xs">{t("tax.center.shortcuts.createFiling")}</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-2 justify-center"
          asChild
        >
          <Link to="/tax/documents">
            <Download className="h-5 w-5" />
            <span className="text-xs">{t("tax.center.shortcuts.exportReport")}</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-2 justify-center"
          asChild
        >
          <Link to="/tax/settings#submission">
            <CreditCard className="h-5 w-5" />
            <span className="text-xs">{t("tax.center.shortcuts.payTaxes")}</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-2 justify-center"
          asChild
        >
          <Link to="/tax/documents">
            <FileText className="h-5 w-5" />
            <span className="text-xs">{t("tax.center.shortcuts.documents")}</span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
