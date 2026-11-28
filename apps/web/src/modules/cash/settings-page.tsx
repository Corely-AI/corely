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
  const uiCopy = useUiCopy("ui.cash-settings-page");
  const { activeWorkspace } = useWorkspace();
  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>(undefined);
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const legalEntityId = activeWorkspace?.legalEntityId ?? activeWorkspace?.id;

  return (
    <>
      <TaxDetailsDialog open={taxDialogOpen} onOpenChange={setTaxDialogOpen} />
      <ContactDetailsDialog open={contactDialogOpen} onOpenChange={setContactDialogOpen} />

      <div className="min-w-0 space-y-5 px-4 py-5 sm:px-5 sm:py-6 lg:space-y-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-semibold">{uiCopy("settings")}</h1>
          <p className="text-sm text-muted-foreground">
            {uiCopy("minimal-operations-settings-for")}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{uiCopy("profile-contact-info")}</CardTitle>
              <CardDescription>{uiCopy("maintain-the-workspace-contact")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setContactDialogOpen(true)}>
                {uiCopy("edit-profile")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tax &amp; VAT</CardTitle>
              <CardDescription>{uiCopy("configure-the-vat-regime")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/settings/tax">Configure tax &amp; VAT</Link>
              </Button>
              <Button variant="outline" onClick={() => setTaxDialogOpen(true)}>
                {uiCopy("edit-tax-ids")}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{uiCopy("payment-methods")}</CardTitle>
              <CardDescription>{uiCopy("choose-the-default-payment")}</CardDescription>
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
