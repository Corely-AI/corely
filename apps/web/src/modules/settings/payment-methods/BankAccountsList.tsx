import React, { useState } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@corely/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@corely/ui";
import {
  useBankAccounts,
  useCreateBankAccount,
  useSetBankAccountDefault,
  useDeactivateBankAccount,
} from "./hooks/useBankAccounts";
import { BankAccountForm } from "./BankAccountForm";
import type { BankAccountDto } from "@corely/contracts";

interface BankAccountsListProps {
  legalEntityId: string;
}

export function BankAccountsList({ legalEntityId }: BankAccountsListProps) {
  const { data, isLoading } = useBankAccounts(legalEntityId);
  const accounts = data?.bankAccounts ?? [];
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const createMutation = useCreateBankAccount();
  const setDefaultMutation = useSetBankAccountDefault();
  const deactivateMutation = useDeactivateBankAccount();

  const activeAccounts = accounts.filter((a) => a.isActive);

  if (isLoading) {
    return <div className="text-muted-foreground">Loading bank accounts...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Bank Accounts</h3>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Bank Account</DialogTitle>
            </DialogHeader>
            <BankAccountForm legalEntityId={legalEntityId} onSuccess={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {activeAccounts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No bank accounts configured yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {activeAccounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <div className="font-medium">{account.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {account.accountHolderName} • {account.currency}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {account.iban ? `IBAN: ****${account.iban.slice(-4)}` : "No IBAN"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {account.isDefault && (
                    <Badge variant="secondary" className="gap-1">
                      <Check className="w-3 h-3" />
                      Default
                    </Badge>
                  )}

                  {!account.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefaultMutation.mutate({ id: account.id, legalEntityId })}
                      disabled={setDefaultMutation.isPending}
                    >
                      Set Default
                    </Button>
                  )}

                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(account.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Deactivate Bank Account</AlertDialogTitle>
          <AlertDialogDescription>
            This bank account will no longer be available for new invoices, but existing invoices
            will retain the payment information.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deactivateMutation.mutate({ id: deleteId, legalEntityId });
                  setDeleteId(null);
                }
              }}
              disabled={deactivateMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
