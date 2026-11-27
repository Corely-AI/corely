import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@corely/ui";
import {
  ContactDetailsDialog,
  PaymentMethodSwitcher,
  TaxDetailsDialog,
} from "@corely/web-shared/settings";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";

export default function SettingsPage() {
  const uiCopy = useUiCopy("ui.freelancer-settings-page");
  const { activeWorkspace } = useWorkspace();
  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>(undefined);
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const legalEntityId = activeWorkspace?.legalEntityId ?? activeWorkspace?.id;

  return (
    <>
      <TaxDetailsDialog open={taxDialogOpen} onOpenChange={setTaxDialogOpen} />
      <ContactDetailsDialog open={contactDialogOpen} onOpenChange={setContactDialogOpen} />

      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{uiCopy("settings")}</h1>
          <p className="text-sm text-muted-foreground">
            {uiCopy("minimal-freelancer-settings-for")}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{uiCopy("profile-company-info")}</CardTitle>
              <CardDescription>{uiCopy("maintain-business-contact-information")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setContactDialogOpen(true)}>
                {uiCopy("edit-profile")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{uiCopy("tax-defaults")}</CardTitle>
              <CardDescription>{uiCopy("set-tax-id-vat")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setTaxDialogOpen(true)}>
                {uiCopy("edit-tax-info")}
              </Button>
              <Button asChild variant="ghost">
                <Link to="/tax/settings">{uiCopy("open-tax-settings")}</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{uiCopy("invoice-defaults")}</CardTitle>
              <CardDescription>{uiCopy("pick-the-payment-method")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {legalEntityId ? (
                <PaymentMethodSwitcher
                  legalEntityId={legalEntityId}
                  selectedId={paymentMethodId}
                  onSelect={setPaymentMethodId}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{uiCopy("no-active-legal-entity")}</p>
              )}
              <Button asChild variant="ghost">
                <Link to="/settings/payment-methods">{uiCopy("manage-payment-methods")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
