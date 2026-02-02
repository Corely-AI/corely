import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { accountingApi } from "@/lib/accounting-api";
import { accountingQueryKeys } from "./accounting.queryKeys";
import type {
  ListLedgerAccountsInput,
  CreateLedgerAccountInput,
  UpdateLedgerAccountInput,
} from "@corely/contracts";

// Query: List accounts
export function useAccounts(query?: ListLedgerAccountsInput) {
  return useQuery({
    queryKey: accountingQueryKeys.accounts.list(query),
    queryFn: () => accountingApi.listAccounts(query),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Query: Get single account
export function useAccount(accountId: string | undefined) {
  return useQuery({
    queryKey: accountingQueryKeys.accounts.detail(accountId || ""),
    queryFn: () => accountingApi.getAccount(accountId || ""),
    enabled: !!accountId,
    staleTime: 30 * 1000,
  });
}

// Mutation: Create account
export function useCreateAccount() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (input: CreateLedgerAccountInput) => accountingApi.createAccount(input),
    onSuccess: (account) => {
      toast.success(t("accounting.toasts.accountCreated", { name: account.name }));
      // Invalidate all account lists and the detail
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.accounts.lists() });
      void queryClient.invalidateQueries({
        queryKey: accountingQueryKeys.accounts.detail(account.id),
      });
    },
    onError: (error: Error) => {
      toast.error(t("accounting.toasts.accountCreateFailed", { message: error.message }));
    },
  });
}

// Mutation: Update account
export function useUpdateAccount() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      accountId,
      patch,
    }: {
      accountId: string;
      patch: Omit<UpdateLedgerAccountInput, "accountId">;
    }) => accountingApi.updateAccount(accountId, patch),
    onSuccess: (account) => {
      toast.success(t("accounting.toasts.accountUpdated", { name: account.name }));
      // Invalidate all account lists and the specific detail
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.accounts.lists() });
      void queryClient.invalidateQueries({
        queryKey: accountingQueryKeys.accounts.detail(account.id),
      });
    },
    onError: (error: Error) => {
      toast.error(t("accounting.toasts.accountUpdateFailed", { message: error.message }));
    },
  });
}
