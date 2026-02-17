import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import NewActivityPage from "./NewActivityPage";

const parseActivityAiMock = vi.fn();
const extractActivityAiMock = vi.fn();
const createActivityMock = vi.fn();
const listDealsMock = vi.fn();
const searchCustomersMock = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

vi.mock("../hooks/useChannels", () => ({
  useCrmChannels: () => ({
    data: [],
  }),
}));

vi.mock("../hooks/useDeal", () => ({
  useCrmAiSettings: () => ({
    data: {
      settings: {
        aiEnabled: true,
        intentSentimentEnabled: false,
      },
    },
  }),
}));

vi.mock("@/lib/crm-api", () => ({
  crmApi: {
    parseActivityAi: (...args: unknown[]) => parseActivityAiMock(...args),
    extractActivityAi: (...args: unknown[]) => extractActivityAiMock(...args),
    createActivity: (...args: unknown[]) => createActivityMock(...args),
    listDeals: (...args: unknown[]) => listDealsMock(...args),
  },
}));

vi.mock("@/lib/customers-api", () => ({
  customersApi: {
    searchCustomers: (...args: unknown[]) => searchCustomersMock(...args),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <NewActivityPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe("NewActivityPage AI parse/apply", () => {
  beforeEach(() => {
    parseActivityAiMock.mockReset();
    extractActivityAiMock.mockReset();
    createActivityMock.mockReset();
    listDealsMock.mockReset();
    searchCustomersMock.mockReset();

    parseActivityAiMock.mockResolvedValue({
      result: {
        activityType: "CALL",
        subject: "Call John about pricing",
        dueAt: "2026-02-18T10:00:00.000Z",
        notesTemplate: "Discuss pricing options and confirm next step.",
        suggestedDeals: [{ id: "deal-42", label: "Enterprise Deal", score: 0.9 }],
        suggestedContacts: [{ id: "party-7", label: "John Doe", score: 0.82 }],
        confidence: 0.86,
      },
    });
    extractActivityAiMock.mockResolvedValue({
      result: {
        summary: "Summary",
        actionItems: [],
        confidence: 0.5,
      },
      followUpToolCards: [],
    });
    createActivityMock.mockResolvedValue({ id: "activity-1" });
    listDealsMock.mockResolvedValue({ deals: [], nextCursor: undefined });
    searchCustomersMock.mockResolvedValue({ customers: [], nextCursor: undefined });
  });

  it("parses natural language input and applies parsed fields", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(
      screen.getByTestId("crm-activity-describe-input"),
      "Call John tomorrow 10:00 about pricing"
    );
    await user.click(screen.getByTestId("crm-activity-describe-parse"));

    await waitFor(() =>
      expect(parseActivityAiMock).toHaveBeenCalledWith({
        description: "Call John tomorrow 10:00 about pricing",
        workspaceLanguage: "en",
      })
    );

    await user.click(screen.getByTestId("crm-activity-describe-apply"));

    expect(screen.getByTestId("crm-new-activity-subject")).toHaveValue("Call John about pricing");
    expect(screen.getByTestId("crm-new-activity-deal-id")).toHaveValue("deal-42");
    expect(screen.getByTestId("crm-new-activity-party-id")).toHaveValue("party-7");
    expect(screen.getByTestId("crm-new-activity-notes")).toHaveValue(
      "Discuss pricing options and confirm next step."
    );
  });
});
