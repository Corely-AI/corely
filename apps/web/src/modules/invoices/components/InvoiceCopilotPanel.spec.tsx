import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InvoiceCopilotPanel } from "./InvoiceCopilotPanel";

const draftIssueEmailMock = vi.fn();
const draftReminderEmailMock = vi.fn();

vi.mock("@/lib/invoices-api", () => ({
  invoicesApi: {
    draftIssueEmail: (...args: unknown[]) => draftIssueEmailMock(...args),
    draftReminderEmail: (...args: unknown[]) => draftReminderEmailMock(...args),
  },
}));

vi.mock("@corely/api-client", () => ({
  normalizeError: () => ({
    detail: "Server draft error",
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@corely/ui", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...(actual as Record<string, unknown>),
    Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
    Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
    Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
    Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
    Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

const renderPanel = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <InvoiceCopilotPanel
        invoiceId="inv-1"
        invoiceStatus="SENT"
        amountDueCents={1_000}
        defaultLanguage="en"
      />
    </QueryClientProvider>
  );
};

describe("InvoiceCopilotPanel", () => {
  beforeEach(() => {
    cleanup();
    draftIssueEmailMock.mockReset();
    draftReminderEmailMock.mockReset();
  });

  it("renders subject/body in modal after drafting invoice email", async () => {
    draftIssueEmailMock.mockResolvedValue({
      subject: "Invoice INV-001",
      body: "Please find your invoice attached.",
    });

    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Draft invoice email" }));

    await waitFor(() =>
      expect(draftIssueEmailMock).toHaveBeenCalledWith("inv-1", {
        language: "en",
        tone: "friendly",
      })
    );

    expect(await screen.findByDisplayValue("Invoice INV-001")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Please find your invoice attached.")).toBeInTheDocument();
  });

  it("shows server error message when drafting fails", async () => {
    draftIssueEmailMock.mockRejectedValue(new Error("boom"));

    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getAllByRole("button", { name: "Draft invoice email" })[0]);

    expect(await screen.findByText("Server draft error")).toBeInTheDocument();
  });
});
