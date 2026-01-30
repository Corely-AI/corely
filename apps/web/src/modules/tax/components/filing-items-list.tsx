import React from "react";
import { useNavigate } from "react-router-dom";
import { TableRowSkeleton } from "@/shared/components/Skeleton";
import { EmptyState } from "@/shared/components/EmptyState";
import { formatDate, formatMoney } from "@/shared/lib/formatters";
import type { TaxFilingItemSourceType } from "@corely/contracts";
import { useTaxFilingItemsQuery } from "../hooks/useTaxFilingItemsQuery";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/pagination";

type FilingItemsListProps = {
  filingId: string;
  sourceType: TaxFilingItemSourceType;
  pageSize?: number;
};

export function FilingItemsList({ filingId, sourceType, pageSize = 5 }: FilingItemsListProps) {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);

  const { data, isLoading, isError } = useTaxFilingItemsQuery(filingId, {
    sourceType,
    page,
    pageSize,
    sort: "date:desc",
  });

  const items = data?.items ?? [];
  const pageInfo = data?.pageInfo;
  const canPrev = page > 1;
  const canNext = pageInfo?.hasNextPage ?? false;

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <TableRowSkeleton key={index} columns={6} />
        ))}
      </div>
    );
  }

  if (isError) {
    return <div className="p-4 text-sm text-destructive text-center">Failed to load items.</div>;
  }

  if (items.length === 0) {
    return (
      <div className="py-8">
        <EmptyState
          title={`No ${sourceType} items`}
          description={`We haven't found any ${sourceType} items for this period.`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                Date
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                Counterparty
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                Description
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                Net
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                Tax
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                Gross
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => navigate(item.deepLink)}
              >
                <td className="px-4 py-2 text-xs">{formatDate(item.date, "en-US")}</td>
                <td className="px-4 py-2 text-xs truncate max-w-[150px]">
                  {item.counterparty ?? "—"}
                </td>
                <td className="px-4 py-2 text-xs truncate max-w-[200px]">
                  {item.description ?? "—"}
                </td>
                <td className="px-4 py-2 text-xs text-right whitespace-nowrap">
                  {item.netCents != null ? formatMoney(item.netCents, "en-US") : "—"}
                </td>
                <td className="px-4 py-2 text-xs text-right whitespace-nowrap">
                  {item.taxCents != null ? formatMoney(item.taxCents, "en-US") : "—"}
                </td>
                <td className="px-4 py-2 text-xs text-right whitespace-nowrap font-medium">
                  {item.grossCents != null ? formatMoney(item.grossCents, "en-US") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageInfo && pageInfo.total > pageSize && (
        <Pagination className="flex justify-center">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={!canPrev ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="text-xs text-muted-foreground px-2">
                Page {page} of {Math.ceil(pageInfo.total / pageSize)}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => p + 1)}
                className={!canNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
