import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { accountingApi } from "@/lib/accounting-api";
import { accountingQueryKeys } from "./accounting.queryKeys";
import type {
  ListJournalEntriesInput,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
  ReverseJournalEntryInput,
} from "@corely/contracts";

// Query: List journal entries
export function useJournalEntries(query?: ListJournalEntriesInput) {
  return useQuery({
    queryKey: accountingQueryKeys.journalEntries.list(query),
    queryFn: () => accountingApi.listJournalEntries(query),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Query: Get single journal entry
export function useJournalEntry(entryId: string | undefined) {
  return useQuery({
    queryKey: accountingQueryKeys.journalEntries.detail(entryId || ""),
    queryFn: () => accountingApi.getJournalEntry(entryId || ""),
    enabled: !!entryId,
    staleTime: 30 * 1000,
  });
}

// Mutation: Create draft journal entry
export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (input: CreateJournalEntryInput) => accountingApi.createJournalEntryDraft(input),
    onSuccess: (entry) => {
      toast.success(t("accounting.toasts.journalEntryDraftCreated"));
      // Invalidate all journal entry lists and the detail
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.journalEntries.lists() });
      void queryClient.invalidateQueries({
        queryKey: accountingQueryKeys.journalEntries.detail(entry.id),
      });
    },
    onError: (error: Error) => {
      toast.error(t("accounting.toasts.journalEntryCreateFailed", { message: error.message }));
    },
  });
}

// Mutation: Update draft journal entry
export function useUpdateJournalEntry() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      entryId,
      patch,
    }: {
      entryId: string;
      patch: Omit<UpdateJournalEntryInput, "entryId">;
    }) => accountingApi.updateJournalEntryDraft(entryId, patch),
    onSuccess: (entry) => {
      toast.success(t("accounting.toasts.journalEntryDraftUpdated"));
      // Invalidate all journal entry lists and the specific detail
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.journalEntries.lists() });
      void queryClient.invalidateQueries({
        queryKey: accountingQueryKeys.journalEntries.detail(entry.id),
      });
    },
    onError: (error: Error) => {
      toast.error(t("accounting.toasts.journalEntryUpdateFailed", { message: error.message }));
    },
  });
}

// Mutation: Post journal entry
export function usePostJournalEntry() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (entryId: string) => accountingApi.postJournalEntry(entryId),
    onSuccess: (entry) => {
      toast.success(t("accounting.toasts.journalEntryPosted", { entryNumber: entry.entryNumber }));
      // Invalidate journal entry lists, detail, and all reports (since posting affects reports)
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.journalEntries.lists() });
      void queryClient.invalidateQueries({
        queryKey: accountingQueryKeys.journalEntries.detail(entry.id),
      });
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.reports.all() });
    },
    onError: (error: Error) => {
      toast.error(t("accounting.toasts.journalEntryPostFailed", { message: error.message }));
    },
  });
}

// Mutation: Reverse journal entry
export function useReverseJournalEntry() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      entryId,
      input,
    }: {
      entryId: string;
      input: Omit<ReverseJournalEntryInput, "entryId">;
    }) => accountingApi.reverseJournalEntry(entryId, input),
    onSuccess: (result) => {
      toast.success(
        t("accounting.toasts.journalEntryReversed", {
          original: result.originalEntry.entryNumber,
          reversal: result.reversalEntry.entryNumber,
        })
      );
      // Invalidate journal entry lists, both entry details, and all reports
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.journalEntries.lists() });
      void queryClient.invalidateQueries({
        queryKey: accountingQueryKeys.journalEntries.detail(result.originalEntry.id),
      });
      void queryClient.invalidateQueries({
        queryKey: accountingQueryKeys.journalEntries.detail(result.reversalEntry.id),
      });
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.reports.all() });
    },
    onError: (error: Error) => {
      toast.error(t("accounting.toasts.journalEntryReverseFailed", { message: error.message }));
    },
  });
}
