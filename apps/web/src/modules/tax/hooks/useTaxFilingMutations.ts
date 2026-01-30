import { useMutation, useQueryClient } from "@tanstack/react-query";
import { taxApi } from "@/lib/tax-api";
import type {
  SubmitTaxFilingRequest,
  MarkTaxFilingPaidRequest,
  AttachTaxFilingDocumentRequest,
} from "@corely/contracts";
import {
  taxFilingAttachmentsQueryKey,
  taxFilingQueryKeys,
  taxFilingActivityQueryKey,
  taxFilingItemsQueryKey,
} from "../queries";

export function useRecalculateFilingMutation(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!id) {
        throw new Error("Missing filing id");
      }
      return taxApi.recalculateFiling(id);
    },
    onSuccess: async () => {
      if (!id) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taxFilingQueryKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: taxFilingActivityQueryKey(id) }),
      ]);
    },
  });
}

export function useSubmitFilingMutation(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SubmitTaxFilingRequest) => {
      if (!id) {
        throw new Error("Missing filing id");
      }
      return taxApi.submitFiling(id, request);
    },
    onSuccess: async () => {
      if (!id) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taxFilingQueryKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: taxFilingActivityQueryKey(id) }),
      ]);
    },
  });
}

export function useMarkPaidFilingMutation(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: MarkTaxFilingPaidRequest) => {
      if (!id) {
        throw new Error("Missing filing id");
      }
      return taxApi.markFilingPaid(id, request);
    },
    onSuccess: async () => {
      if (!id) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taxFilingQueryKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: taxFilingActivityQueryKey(id) }),
      ]);
    },
  });
}

export function useDeleteFilingMutation(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!id) {
        throw new Error("Missing filing id");
      }
      return taxApi.deleteFiling(id);
    },
    onSuccess: async () => {
      if (!id) return;
      await queryClient.invalidateQueries({ queryKey: taxFilingQueryKeys.list() });
    },
  });
}

export function useAttachFilingDocumentMutation(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: AttachTaxFilingDocumentRequest) => {
      if (!id) {
        throw new Error("Missing filing id");
      }
      return taxApi.attachFilingDocument(id, request);
    },
    onSuccess: async () => {
      if (!id) return;
      await queryClient.invalidateQueries({ queryKey: taxFilingAttachmentsQueryKey(id) });
    },
  });
}

export function useRemoveFilingAttachmentMutation(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => {
      if (!id) {
        throw new Error("Missing filing id");
      }
      return taxApi.removeFilingAttachment(id, attachmentId);
    },
    onSuccess: async () => {
      if (!id) return;
      await queryClient.invalidateQueries({ queryKey: taxFilingAttachmentsQueryKey(id) });
    },
  });
}

export function useInvalidateFilingItems(id: string | undefined, params?: unknown) {
  const queryClient = useQueryClient();
  return async () => {
    if (!id) return;
    await queryClient.invalidateQueries({ queryKey: taxFilingItemsQueryKey(id, params) });
  };
}
