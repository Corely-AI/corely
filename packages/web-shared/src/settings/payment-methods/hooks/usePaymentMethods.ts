import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CreatePaymentMethodInput, UpdatePaymentMethodInput } from "@corely/contracts";
import { paymentMethodsApi } from "@corely/web-shared/lib/payment-methods-api";

export const paymentMethodQueryKeys = {
  list: (legalEntityId: string) => ["payment-methods", legalEntityId] as const,
  detail: (id: string) => ["payment-method", id] as const,
};

export function usePaymentMethods(legalEntityId: string) {
  return useQuery({
    queryKey: paymentMethodQueryKeys.list(legalEntityId),
    queryFn: () => paymentMethodsApi.listPaymentMethods(legalEntityId),
    staleTime: 30 * 1000,
  });
}

export function useCreatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePaymentMethodInput & { legalEntityId: string }) => {
      const { legalEntityId, ...data } = input;
      return paymentMethodsApi.createPaymentMethod(data, legalEntityId);
    },
    onSuccess: (_, { legalEntityId }) => {
      toast.success("Payment method created");
      void queryClient.invalidateQueries({
        queryKey: paymentMethodQueryKeys.list(legalEntityId),
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create payment method: ${error.message}`);
    },
  });
}

export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
      legalEntityId,
    }: {
      id: string;
      input: UpdatePaymentMethodInput;
      legalEntityId: string;
    }) => {
      return paymentMethodsApi.updatePaymentMethod(id, input);
    },
    onSuccess: (_, { legalEntityId, id }) => {
      toast.success("Payment method updated");
      void queryClient.invalidateQueries({
        queryKey: paymentMethodQueryKeys.list(legalEntityId),
      });
      void queryClient.invalidateQueries({
        queryKey: paymentMethodQueryKeys.detail(id),
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update payment method: ${error.message}`);
    },
  });
}

export function useSetPaymentMethodDefault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, legalEntityId }: { id: string; legalEntityId: string }) => {
      return paymentMethodsApi.setPaymentMethodDefault(id);
    },
    onSuccess: (_, { legalEntityId }) => {
      toast.success("Payment method set as default");
      void queryClient.invalidateQueries({
        queryKey: paymentMethodQueryKeys.list(legalEntityId),
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to set default: ${error.message}`);
    },
  });
}

export function useDeactivatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, legalEntityId }: { id: string; legalEntityId: string }) => {
      return paymentMethodsApi.deactivatePaymentMethod(id);
    },
    onSuccess: (_, { legalEntityId }) => {
      toast.success("Payment method deactivated");
      void queryClient.invalidateQueries({
        queryKey: paymentMethodQueryKeys.list(legalEntityId),
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate payment method: ${error.message}`);
    },
  });
}
