import React, { type FC, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@corely/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@corely/ui";
import { useJournalEntries } from "../queries";
import { EntryStatusBadge, Money } from "../components";
import type { EntryStatus } from "@corely/contracts";

/**
 * Journal Entries list with filtering and search
 */
export const JournalEntriesList: FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EntryStatus | "all">("all");

  const { data, isLoading } = useJournalEntries({
    limit: 50,
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const entries = data?.entries || [];

  // Calculate total for each entry (sum of debits or credits, they're equal)
  const getEntryTotal = (entry: (typeof entries)[0]) => {
    const totalDebits = entry.lines
      .filter((l) => l.direction === "Debit")
      .reduce((sum, l) => sum + l.amountCents, 0);
    return totalDebits;
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("accounting.journalEntries.title")}</h1>
          <p className="text-muted-foreground">{t("accounting.journalEntries.subtitle")}</p>
        </div>
        <Button onClick={() => navigate("/accounting/journal-entries/new")}>
          <Plus className="h-4 w-4 mr-2" />
          {t("accounting.journalEntries.newEntry")}
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
                  placeholder={t("accounting.journalEntries.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as EntryStatus | "all")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("accounting.journalEntries.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("accounting.journalEntries.allStatuses")}</SelectItem>
                <SelectItem value="Draft">{t("accounting.entryStatus.draft")}</SelectItem>
                <SelectItem value="Posted">{t("accounting.entryStatus.posted")}</SelectItem>
                <SelectItem value="Reversed">{t("accounting.entryStatus.reversed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("accounting.journalEntries.entries")}</CardTitle>
              <CardDescription>
                {t("accounting.journalEntries.entriesFound", { count: data?.total || 0 })}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("accounting.journalEntries.loading")}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("accounting.journalEntries.emptyTitle")}</p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => navigate("/accounting/journal-entries/new")}
              >
                {t("accounting.journalEntries.emptyAction")}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">
                    {t("accounting.journalEntries.entryNumber")}
                  </TableHead>
                  <TableHead className="w-[120px]">{t("accounting.journalEntries.date")}</TableHead>
                  <TableHead>{t("accounting.journalEntries.memo")}</TableHead>
                  <TableHead className="w-[120px]">{t("common.status")}</TableHead>
                  <TableHead className="w-[140px] text-right">
                    {t("accounting.journalEntries.amount")}
                  </TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/accounting/journal-entries/${entry.id}`)}
                  >
                    <TableCell className="font-mono text-sm">
                      {entry.entryNumber || (
                        <span className="text-muted-foreground italic">
                          {t("accounting.entryStatus.draft")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(entry.postingDate).toLocaleDateString(i18n.language)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <div className="font-medium line-clamp-1">{entry.memo}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("accounting.journalEntries.linesCount", {
                            count: entry.lines.length,
                          })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <EntryStatusBadge status={entry.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money
                        amountCents={getEntryTotal(entry)}
                        currency={entry.lines[0]?.currency || "EUR"}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/accounting/journal-entries/${entry.id}`);
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
