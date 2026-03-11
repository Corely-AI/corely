import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createDefaultPersonalDetailsSectionPayload,
  type GetTaxReportSectionOutput,
  type UpsertTaxReportSectionOutput,
} from "@corely/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTaxReportSection } from "./useTaxReportSection";

const getSectionMock = vi.fn();
const upsertSectionMock = vi.fn();

vi.mock("@corely/web-shared/lib/tax-report-api", () => ({
  taxReportApi: {
    getSection: (...args: unknown[]) => getSectionMock(...args),
    upsertSection: (...args: unknown[]) => upsertSectionMock(...args),
  },
}));

const buildGetSectionResponse = (firstName: string): GetTaxReportSectionOutput => ({
  report: {
    id: "report-1",
    type: "annual_income_report",
    status: "draft",
    sections: [],
  },
  section: {
    id: "section-1",
    filingId: "filing-1",
    reportId: "report-1",
    reportType: "annual_income_report",
    sectionKey: "personalDetails",
    completion: 1,
    isComplete: true,
    validationErrors: [],
    payload: {
      personalDetails: {
        ...createDefaultPersonalDetailsSectionPayload(),
        firstName,
      },
    },
    createdAt: "2026-03-11T10:00:00.000Z",
    updatedAt: "2026-03-11T10:00:00.000Z",
  },
});

const buildUpsertResponse = (firstName: string): UpsertTaxReportSectionOutput => ({
  report: {
    id: "report-1",
    type: "annual_income_report",
    status: "draft",
    sections: [],
  },
  section: {
    id: "section-1",
    filingId: "filing-1",
    reportId: "report-1",
    reportType: "annual_income_report",
    sectionKey: "personalDetails",
    completion: 1,
    isComplete: true,
    validationErrors: [],
    payload: {
      personalDetails: {
        ...createDefaultPersonalDetailsSectionPayload(),
        firstName,
      },
    },
    createdAt: "2026-03-11T10:00:00.000Z",
    updatedAt: "2026-03-11T10:05:00.000Z",
  },
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useTaxReportSection", () => {
  beforeEach(() => {
    getSectionMock.mockReset();
    upsertSectionMock.mockReset();
  });

  it("loads the saved section payload from the backend", async () => {
    getSectionMock.mockResolvedValue(buildGetSectionResponse("Ada"));

    const { result } = renderHook(
      () =>
        useTaxReportSection({
          filingId: "filing-1",
          reportId: "report-1",
          sectionKey: "personalDetails",
          defaultValue: createDefaultPersonalDetailsSectionPayload(),
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(result.current.value.firstName).toBe("Ada");
    expect(result.current.saveState).toBe("saved");
  });

  it("autosaves section changes through the backend section API", async () => {
    getSectionMock.mockResolvedValue(buildGetSectionResponse("Ada"));
    upsertSectionMock.mockResolvedValue(buildUpsertResponse("Grace"));

    const { result } = renderHook(
      () =>
        useTaxReportSection({
          filingId: "filing-1",
          reportId: "report-1",
          sectionKey: "personalDetails",
          defaultValue: createDefaultPersonalDetailsSectionPayload(),
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    act(() => {
      result.current.setValue({
        ...result.current.value,
        firstName: "Grace",
      });
    });

    await waitFor(
      () =>
        expect(upsertSectionMock).toHaveBeenCalledWith("filing-1", "report-1", "personalDetails", {
          payload: expect.objectContaining({
            firstName: "Grace",
          }),
        }),
      { timeout: 2_000 }
    );
  });
});
