import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@corely/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@corely/ui";
import { BankAccountsList } from "./BankAccountsList";
import { PaymentMethodsList } from "./PaymentMethodsList";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";

export function PaymentMethodsSettings() {
  const { activeWorkspace } = useWorkspace();
  const legalEntityId = activeWorkspace?.legalEntityId ?? activeWorkspace?.id;

  if (!activeWorkspace?.id || !legalEntityId) {
    return <div className="text-center py-8 text-muted-foreground">Please select a workspace</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-foreground">Payment Methods</h1>
        <p className="text-muted-foreground">
          Manage bank accounts and payment methods for {activeWorkspace.name}
        </p>
      </div>

      <Tabs keepMounted defaultValue="accounts" className="w-full">
        <TabsList>
          <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bank Accounts</CardTitle>
              <CardDescription>
                Configure bank accounts that can be used for bank transfer payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BankAccountsList legalEntityId={legalEntityId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Set up payment methods to offer to your customers on invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentMethodsList legalEntityId={legalEntityId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <strong>1. Bank Accounts:</strong> Add your bank account details (IBAN, BIC, etc.) for
            customers who want to pay via bank transfer.
          </div>
          <div>
            <strong>2. Payment Methods:</strong> Create payment methods that reference your bank
            accounts or specify other payment instructions (PayPal, Cash, etc.).
          </div>
          <div>
            <strong>3. Invoices:</strong> When creating an invoice, select a payment method. The
            payment details will be frozen and displayed on the PDF.
          </div>
          <div>
            <strong>4. Immutability:</strong> Once an invoice is issued, payment details cannot be
            changed, ensuring historical accuracy.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
