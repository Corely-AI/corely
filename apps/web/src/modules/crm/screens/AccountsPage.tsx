import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { crmApi } from "@/lib/crm-api";
import { EmptyState } from "@/shared/components/EmptyState";
import type { AccountDto } from "@corely/contracts";

export default function AccountsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    queryKey: ["accounts", search],
    queryFn: () => crmApi.listAccounts({ q: search || undefined }),
  });

  const accounts = data?.items ?? [];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="crm-accounts-list">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">Accounts</h1>
        <Button
          variant="accent"
          onClick={() => navigate("/crm/accounts/new")}
          data-testid="crm-accounts-create"
        >
          <Plus className="h-4 w-4" />
          New Account
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="crm-accounts-search"
          />
        </div>
      </div>

      {accounts.length === 0 ? (
        <Card data-testid="crm-accounts-empty">
          <CardContent className="p-0">
            <EmptyState
              icon={Building2}
              title="No accounts found"
              description="Create a new account to get started."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3" data-testid="crm-accounts-grid">
          {accounts.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              onClick={() => navigate(`/crm/accounts/${account.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountRow({ account, onClick }: { account: AccountDto; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer hover:bg-accent/5 transition-colors"
      onClick={onClick}
      data-testid={`crm-account-row-${account.id}`}
    >
      <CardContent className="flex items-center gap-4 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate" data-testid="crm-account-name">
            {account.name}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {[account.email, account.phone].filter(Boolean).join(" · ") || "No contact info"}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-sm">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              account.status === "ACTIVE"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : account.status === "PROSPECT"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
            }`}
            data-testid="crm-account-status"
          >
            {account.status}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
            data-testid="crm-account-type"
          >
            {account.accountType}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
