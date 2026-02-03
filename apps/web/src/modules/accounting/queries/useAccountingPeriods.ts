import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { accountingApi } from "@/lib/accounting-api";
import { accountingQueryKeys } from "./accounting.queryKeys";

// Query: List accounting periods
export function useAccountingPeriods() {
  return useQuery({
    queryKey: accountingQueryKeys.periods.list(),
    queryFn: () => accountingApi.listPeriods(),
    staleTime: 5 * 60 * 1000, // 5 minutes - periods change rarely
  });
}

// Mutation: Close period
export function useClosePeriod() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ periodId, confirmation }: { periodId: string; confirmation: boolean }) =>
      accountingApi.closePeriod(periodId, confirmation),
    onSuccess: (period) => {
      toast.success(t("accounting.toasts.periodClosed", { name: period.name }));
      // Invalidate periods list
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.periods.list() });
    },
    onError: (error: Error) => {
      toast.error(t("accounting.toasts.periodCloseFailed", { message: error.message }));
    },
  });
}

// Mutation: Reopen period
export function useReopenPeriod() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ periodId, reason }: { periodId: string; reason: string }) =>
      accountingApi.reopenPeriod(periodId, reason),
    onSuccess: (period) => {
      toast.success(t("accounting.toasts.periodReopened", { name: period.name }));
      // Invalidate periods list
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.periods.list() });
    },
    onError: (error: Error) => {
      toast.error(t("accounting.toasts.periodReopenFailed", { message: error.message }));
    },
  });
}
