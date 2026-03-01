import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import NewActivityPage from "./NewActivityPage";

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

const parseActivityAiMock = vi.fn();
const extractActivityAiMock = vi.fn();
const createActivityMock = vi.fn();
const listDealsMock = vi.fn();
const searchCustomersMock = vi.fn();
const listCustomersMock = vi.fn();
const getCustomerMock = vi.fn();

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

vi.mock("@corely/web-shared/lib/crm-api", () => ({
  crmApi: {
    parseActivityAi: (...args: unknown[]) => parseActivityAiMock(...args),
    extractActivityAi: (...args: unknown[]) => extractActivityAiMock(...args),
    createActivity: (...args: unknown[]) => createActivityMock(...args),
    listDeals: (...args: unknown[]) => listDealsMock(...args),
  },
}));

vi.mock("@corely/web-shared/lib/customers-api", () => ({
  customersApi: {
    searchCustomers: (...args: unknown[]) => searchCustomersMock(...args),
    listCustomers: (...args: unknown[]) => listCustomersMock(...args),
    getCustomer: (...args: unknown[]) => getCustomerMock(...args),
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
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    if (!HTMLElement.prototype.scrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        value: vi.fn(),
        writable: true,
      });
    }

    parseActivityAiMock.mockReset();
    extractActivityAiMock.mockReset();
    createActivityMock.mockReset();
    listDealsMock.mockReset();
    searchCustomersMock.mockReset();
    listCustomersMock.mockReset();
    getCustomerMock.mockReset();

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
    listDealsMock.mockResolvedValue({
      deals: [
        { id: "deal-42", title: "Enterprise Deal", partyId: "party-7" },
        { id: "deal-123", title: "Expansion Deal", partyId: "party-22" },
      ],
      nextCursor: undefined,
    });
    searchCustomersMock.mockResolvedValue({ customers: [], nextCursor: undefined });
    listCustomersMock.mockResolvedValue({
      customers: [
        { id: "party-7", displayName: "John Doe" },
        { id: "party-22", displayName: "Anna Smith" },
      ],
      nextCursor: undefined,
    });
    getCustomerMock.mockImplementation(async (id: string) => {
      if (id === "party-7") {
        return { id: "party-7", displayName: "Anh", phone: "+49 176 123 45678" };
      }
      if (id === "party-22") {
        return { id: "party-22", displayName: "Anna Smith" };
      }
      return null;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("allows searching and selecting deal and contact from pickers", async () => {
    const user = userEvent.setup();
    renderPage();

    const dealPicker = screen.getAllByTestId("crm-new-activity-deal-picker").at(-1);
    expect(dealPicker).toBeDefined();
    if (!dealPicker) {
      throw new Error("Deal picker not found");
    }
    await user.click(dealPicker);
    await user.type(screen.getByPlaceholderText("Search deals..."), "enterprise");
    await user.click(await screen.findByTestId("crm-new-activity-deal-option-deal-42"));

    const dealIdInput = screen.getAllByTestId("crm-new-activity-deal-id").at(-1);
    expect(dealIdInput).toHaveValue("deal-42");

    const partyPicker = screen.getAllByTestId("crm-new-activity-party-picker").at(-1);
    expect(partyPicker).toBeDefined();
    if (!partyPicker) {
      throw new Error("Party picker not found");
    }
    await user.click(partyPicker);
    await user.type(screen.getByPlaceholderText("Search contacts..."), "john");
    await user.click(await screen.findByTestId("crm-new-activity-party-option-party-7"));

    const partyIdInput = screen.getAllByTestId("crm-new-activity-party-id").at(-1);
    expect(partyIdInput).toHaveValue("party-7");
  });

  it("shows whatsapp chat button when selected deal contact has phone", async () => {
    const user = userEvent.setup();
    renderPage();

    const dealPicker = screen.getAllByTestId("crm-new-activity-deal-picker").at(-1);
    expect(dealPicker).toBeDefined();
    if (!dealPicker) {
      throw new Error("Deal picker not found");
    }
    await user.click(dealPicker);
    await user.click(await screen.findByTestId("crm-new-activity-deal-option-deal-42"));

    await waitFor(() =>
      expect(screen.getAllByTestId("crm-new-activity-whatsapp-link").length).toBeGreaterThan(0)
    );
    const whatsappLink = screen.getAllByTestId("crm-new-activity-whatsapp-link").at(-1);
    expect(whatsappLink).toBeDefined();
    if (!whatsappLink) {
      throw new Error("WhatsApp link not found");
    }
    expect(whatsappLink).toHaveAttribute("href", "https://wa.me/4917612345678?text=Hello%20Anh");
    expect(whatsappLink).toHaveAttribute("target", "_blank");
  });
});
