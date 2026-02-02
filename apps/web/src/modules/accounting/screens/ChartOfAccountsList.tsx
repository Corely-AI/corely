import React, { type FC, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { useAccounts } from "../queries";
import { AccountTypeBadge } from "../components";
import type { AccountType } from "@corely/contracts";

/**
 * Chart of Accounts list with filtering and search
 */
export const ChartOfAccountsList: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccountType | "all">("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");

  const { data, isLoading } = useAccounts({
    limit: 100,
    search: search || undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const accounts = data?.accounts || [];

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("accounting.chartOfAccounts.title")}</h1>
          <p className="text-muted-foreground">{t("accounting.chartOfAccounts.subtitle")}</p>
        </div>
        <Button onClick={() => navigate("/accounting/accounts/new")}>
          <Plus className="h-4 w-4 mr-2" />
          {t("accounting.chartOfAccounts.newAccount")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("common.filter")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("accounting.chartOfAccounts.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as AccountType | "all")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("accounting.chartOfAccounts.allTypes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("accounting.chartOfAccounts.allTypes")}</SelectItem>
                <SelectItem value="Asset">{t("accounting.accountTypes.asset")}</SelectItem>
                <SelectItem value="Liability">{t("accounting.accountTypes.liability")}</SelectItem>
                <SelectItem value="Equity">{t("accounting.accountTypes.equity")}</SelectItem>
                <SelectItem value="Income">{t("accounting.accountTypes.income")}</SelectItem>
                <SelectItem value="Expense">{t("accounting.accountTypes.expense")}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={activeFilter}
              onValueChange={(value) => setActiveFilter(value as "all" | "active" | "inactive")}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t("common.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("accounting.chartOfAccounts.allStatuses")}</SelectItem>
                <SelectItem value="active">{t("accounting.chartOfAccounts.activeOnly")}</SelectItem>
                <SelectItem value="inactive">
                  {t("accounting.chartOfAccounts.inactiveOnly")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("accounting.chartOfAccounts.accounts")}</CardTitle>
              <CardDescription>
                {t("accounting.chartOfAccounts.accountsFound", { count: data?.total || 0 })}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("accounting.chartOfAccounts.loading")}
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("accounting.chartOfAccounts.empty")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">
                    {t("accounting.chartOfAccounts.code")}
                  </TableHead>
                  <TableHead>{t("accounting.chartOfAccounts.name")}</TableHead>
                  <TableHead className="w-[120px]">
                    {t("accounting.chartOfAccounts.type")}
                  </TableHead>
                  <TableHead className="w-[100px]">{t("common.status")}</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow
                    key={account.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/accounting/accounts/${account.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{account.code}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{account.name}</div>
                        {account.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {account.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <AccountTypeBadge type={account.type} />
                    </TableCell>
                    <TableCell>
                      {account.isActive ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {t("accounting.chartOfAccounts.active")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                          {t("accounting.chartOfAccounts.inactive")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/accounting/accounts/${account.id}`);
                        }}
                      >
                        {t("common.view")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* TODO: Add cursor-based pagination controls if needed */}
        </CardContent>
      </Card>
    </div>
  );
};
