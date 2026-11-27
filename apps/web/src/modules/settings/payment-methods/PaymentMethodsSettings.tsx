import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@corely/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@corely/ui";
import { BankAccountsList } from "./BankAccountsList";
import { PaymentMethodsList } from "./PaymentMethodsList";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";

export function PaymentMethodsSettings() {
  const uiCopy = useUiCopy("ui.settings-payment-methods-paymentmethodssettings");
  const { activeWorkspace } = useWorkspace();
  const legalEntityId = activeWorkspace?.legalEntityId ?? activeWorkspace?.id;

  if (!activeWorkspace?.id || !legalEntityId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {uiCopy("please-select-a-workspace")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-foreground">{uiCopy("payment-methods")}</h1>
        <p className="text-muted-foreground">
          {uiCopy("manage-bank-accounts-and") + " "}
          {activeWorkspace.name}
        </p>
      </div>

      <Tabs keepMounted defaultValue="accounts" className="w-full">
        <TabsList>
          <TabsTrigger value="accounts">{uiCopy("bank-accounts")}</TabsTrigger>
          <TabsTrigger value="methods">{uiCopy("payment-methods")}</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{uiCopy("bank-accounts")}</CardTitle>
              <CardDescription>{uiCopy("configure-bank-accounts-that")}</CardDescription>
            </CardHeader>
            <CardContent>
              <BankAccountsList legalEntityId={legalEntityId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{uiCopy("payment-methods")}</CardTitle>
              <CardDescription>{uiCopy("set-up-payment-methods")}</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentMethodsList legalEntityId={legalEntityId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{uiCopy("how-it-works")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <strong>{uiCopy("1-bank-accounts")}</strong>
            {" " + uiCopy("add-your-bank-account")}
          </div>
          <div>
            <strong>{uiCopy("2-payment-methods")}</strong>
            {" " + uiCopy("create-payment-methods-that")}
          </div>
          <div>
            <strong>{uiCopy("3-invoices")}</strong>
            {" " + uiCopy("when-creating-an-invoice")}
          </div>
          <div>
            <strong>{uiCopy("4-immutability")}</strong>
            {" " + uiCopy("once-an-invoice-is")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
