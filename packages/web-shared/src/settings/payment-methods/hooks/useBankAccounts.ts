import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CreateBankAccountInput, UpdateBankAccountInput } from "@corely/contracts";
import { paymentMethodsApi } from "@corely/web-shared/lib/payment-methods-api";

export const bankAccountQueryKeys = {
  list: (legalEntityId: string, includeSensitive = false) =>
    ["bank-accounts", legalEntityId, includeSensitive] as const,
  detail: (id: string) => ["bank-account", id] as const,
};

export function useBankAccounts(
  legalEntityId: string,
  options?: {
    includeSensitive?: boolean;
  }
) {
  const includeSensitive = options?.includeSensitive ?? false;

  return useQuery({
    queryKey: bankAccountQueryKeys.list(legalEntityId, includeSensitive),
    queryFn: () => paymentMethodsApi.listBankAccounts(legalEntityId, { includeSensitive }),
    staleTime: 30 * 1000,
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBankAccountInput & { legalEntityId: string }) => {
      const { legalEntityId, ...data } = input;
      return paymentMethodsApi.createBankAccount(data, legalEntityId);
    },
    onSuccess: (_, { legalEntityId }) => {
      toast.success("Bank account created");
      void queryClient.invalidateQueries({
        queryKey: ["bank-accounts", legalEntityId],
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create bank account: ${error.message}`);
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
      legalEntityId,
    }: {
      id: string;
      input: UpdateBankAccountInput;
      legalEntityId: string;
    }) => {
      return paymentMethodsApi.updateBankAccount(id, input);
    },
    onSuccess: (_, { legalEntityId, id }) => {
      toast.success("Bank account updated");
      void queryClient.invalidateQueries({
        queryKey: ["bank-accounts", legalEntityId],
      });
      void queryClient.invalidateQueries({
        queryKey: bankAccountQueryKeys.detail(id),
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update bank account: ${error.message}`);
    },
  });
}

export function useSetBankAccountDefault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, legalEntityId }: { id: string; legalEntityId: string }) => {
      return paymentMethodsApi.setBankAccountDefault(id);
    },
    onSuccess: (_, { legalEntityId }) => {
      toast.success("Bank account set as default");
      void queryClient.invalidateQueries({
        queryKey: ["bank-accounts", legalEntityId],
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to set default: ${error.message}`);
    },
  });
}

export function useDeactivateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, legalEntityId }: { id: string; legalEntityId: string }) => {
      return paymentMethodsApi.deactivateBankAccount(id);
    },
    onSuccess: (_, { legalEntityId }) => {
      toast.success("Bank account deactivated");
      void queryClient.invalidateQueries({
        queryKey: ["bank-accounts", legalEntityId],
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate bank account: ${error.message}`);
    },
  });
}
