import type {
  TaxReportSectionKey,
  TaxReportSectionValueByKey,
  TaxReportSectionValidationError,
} from "@corely/contracts";
import { taxReportApi } from "@corely/web-shared/lib/tax-report-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { taxReportSectionQueryKey, taxReportSectionsQueryKey } from "../queries";

type UseTaxReportSectionParams<K extends TaxReportSectionKey> = {
  filingId: string;
  reportId: string;
  sectionKey: K;
  defaultValue: TaxReportSectionValueByKey[K];
  enabled?: boolean;
};

type SaveState = "loading" | "saving" | "saved" | "error";

export const useTaxReportSection = <K extends TaxReportSectionKey>({
  filingId,
  reportId,
  sectionKey,
  defaultValue,
  enabled = true,
}: UseTaxReportSectionParams<K>) => {
  const queryClient = useQueryClient();
  const queryKey = taxReportSectionQueryKey(filingId, reportId, sectionKey);
  const sectionsQueryKey = taxReportSectionsQueryKey(filingId, reportId);
  const [value, setValue] = React.useState<TaxReportSectionValueByKey[K]>(defaultValue);
  const [lastSavedSnapshot, setLastSavedSnapshot] = React.useState("");
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState<TaxReportSectionValidationError[]>(
    []
  );

  const sectionQuery = useQuery({
    queryKey,
    queryFn: () => taxReportApi.getSection(filingId, reportId, sectionKey),
    enabled,
  });

  const upsertMutation = useMutation({
    mutationFn: (payload: TaxReportSectionValueByKey[K]) =>
      taxReportApi.upsertSection(filingId, reportId, sectionKey, { payload }),
    onSuccess: (result) => {
      const sectionPayload = result.section.payload as Record<
        string,
        TaxReportSectionValueByKey[K]
      >;
      const nextValue = sectionPayload[sectionKey] ?? defaultValue;
      const snapshot = JSON.stringify(nextValue);
      setValidationErrors(result.section.validationErrors);
      setLastSavedSnapshot(snapshot);
      queryClient.setQueryData(queryKey, result);
      void queryClient.invalidateQueries({ queryKey: sectionsQueryKey });
    },
  });

  React.useEffect(() => {
    if (!sectionQuery.data) {
      return;
    }

    const payload =
      (sectionQuery.data.section.payload as Record<string, TaxReportSectionValueByKey[K]>)[
        sectionKey
      ] ?? defaultValue;
    const snapshot = JSON.stringify(payload);

    if (!isInitialized) {
      setValue(payload);
      setLastSavedSnapshot(snapshot);
      setValidationErrors(sectionQuery.data.section.validationErrors);
      setIsInitialized(true);
      return;
    }

    if (snapshot === lastSavedSnapshot) {
      setValidationErrors(sectionQuery.data.section.validationErrors);
    }
  }, [defaultValue, isInitialized, lastSavedSnapshot, sectionKey, sectionQuery.data]);

  const snapshot = React.useMemo(() => JSON.stringify(value), [value]);
  const isDirty = isInitialized && snapshot !== lastSavedSnapshot;

  React.useEffect(() => {
    if (!enabled || !isInitialized || !isDirty || upsertMutation.isPending) {
      return;
    }

    const timer = window.setTimeout(() => {
      upsertMutation.mutate(value);
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [enabled, isDirty, isInitialized, upsertMutation, value]);

  const saveState: SaveState =
    sectionQuery.isLoading && !isInitialized
      ? "loading"
      : upsertMutation.isError
        ? "error"
        : upsertMutation.isPending || isDirty
          ? "saving"
          : "saved";

  return {
    value,
    setValue,
    validationErrors,
    section: upsertMutation.data?.section ?? sectionQuery.data?.section,
    report: upsertMutation.data?.report ?? sectionQuery.data?.report,
    isInitialized,
    isLoading: sectionQuery.isLoading && !isInitialized,
    isError: sectionQuery.isError,
    refetch: sectionQuery.refetch,
    saveState,
    retrySave: () => upsertMutation.mutate(value),
  };
};
