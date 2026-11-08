import { z } from "zod";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SessionProviders } from "./session-provider";
import { useSession } from "./session-context";
const data = {
  csrfToken: "a".repeat(43),
  expiresAt: "2099-01-01T00:00:00.000Z",
  appKey: "invoice",
  user: {
    userId: "synthetic",
    email: "colleague@example.invalid",
    name: "Synthetic colleague",
    memberships: [],
  },
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
function BodyRequest() {
  const { client } = useSession();
  return (
    <button
      onClick={() => {
        void client.json("/invoices", z.unknown()).catch(() => {});
      }}
    >
      Load protected data
    </button>
  );
}
function Protected() {
  const session = useSession();
  return (
    <div>
      Private colleague:{" "}
      {session.state.status === "authenticated" ? session.state.session.user.name : "hidden"}
    </div>
  );
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("shared session provider", () => {
  it("holds protected UI until server verification completes", async () => {
    let finish!: (value: Response) => void;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    render(
      <SessionProviders config={{ appKey: "invoice" }} fetchFn={fetcher}>
        <Protected />
      </SessionProviders>
    );
    expect(screen.getByRole("status")).toHaveTextContent("Checking your session");
    expect(screen.queryByText(/Private colleague/)).toBeNull();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    finish(json(data));
    expect(await screen.findByText("Private colleague: Synthetic colleague")).toBeVisible();
  });
  it.each([
    [401, "Sign in to continue"],
    [403, "You do not have access"],
    [503, "temporarily unavailable"],
  ] as const)(
    "shows distinct %s state without redirect or repeated requests",
    async (status, text) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({}, status));
      const navigate = vi.fn();
      render(
        <SessionProviders config={{ appKey: "invoice" }} fetchFn={fetcher} navigate={navigate}>
          <Protected />
        </SessionProviders>
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(text);
      expect(navigate).not.toHaveBeenCalled();
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(/Private colleague/)).toBeNull();
      if (status === 403) {
        expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
      }
    }
  );
  it("allows a manual retry after outage", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json(data));
    render(
      <SessionProviders config={{ appKey: "invoice" }} fetchFn={fetcher}>
        <Protected />
      </SessionProviders>
    );
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/Private colleague/)).toBeVisible();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("reuses the provider for all registered apps and isolates configuration changes", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () =>
      json({
        ...data,
        appKey: fetcher.mock.calls.length === 1 ? "invoice" : "hr",
        user: {
          ...data.user,
          name: fetcher.mock.calls.length === 1 ? "First account" : "Second account",
        },
      })
    );
    const view = render(
      <SessionProviders config={{ appKey: "invoice" }} fetchFn={fetcher}>
        <Protected />
      </SessionProviders>
    );
    expect(await screen.findByText(/First account/)).toBeVisible();
    view.rerender(
      <SessionProviders config={{ appKey: "hr" }} fetchFn={fetcher}>
        <Protected />
      </SessionProviders>
    );
    expect(screen.queryByText(/First account/)).toBeNull();
    expect(await screen.findByText(/Second account/)).toBeVisible();
  });
  it("hides protected children when the connection fails after response headers", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(data))
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream({
            start(sink) {
              sink.error(new TypeError("connection lost"));
            },
          })
        )
      );
    render(
      <SessionProviders config={{ appKey: "invoice" }} fetchFn={fetcher}>
        <Protected />
        <BodyRequest />
      </SessionProviders>
    );
    fireEvent.click(await screen.findByRole("button", { name: "Load protected data" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("temporarily unavailable");
    expect(screen.queryByText(/Private colleague/)).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not restore auth after an obsolete bootstrap resolves", async () => {
    let stale!: (value: Response) => void;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            stale = resolve;
          })
      )
      .mockResolvedValueOnce(
        json({ ...data, appKey: "hr", user: { ...data.user, name: "Current account" } })
      );
    const view = render(
      <SessionProviders config={{ appKey: "invoice" }} fetchFn={fetcher}>
        <Protected />
      </SessionProviders>
    );
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    view.rerender(
      <SessionProviders config={{ appKey: "hr" }} fetchFn={fetcher}>
        <Protected />
      </SessionProviders>
    );
    expect(await screen.findByText(/Current account/)).toBeVisible();
    stale(json(data));
    await waitFor(() => expect(screen.queryByText(/Synthetic colleague/)).toBeNull());
  });
});

function LogoutAction() {
  const { logout } = useSession();
  return (
    <button
      onClick={() => {
        void logout();
      }}
    >
      Sign out of Corely
    </button>
  );
}
describe("session revocation boundary", () => {
  it("hides private content before logout finishes and offers manual sign-in only after success", async () => {
    let finish!: (value: Response) => void;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(data))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      );
    render(
      <SessionProviders config={{ appKey: "invoice" }} fetchFn={fetcher}>
        <Protected />
        <LogoutAction />
      </SessionProviders>
    );
    fireEvent.click(await screen.findByRole("button", { name: "Sign out of Corely" }));
    expect(screen.queryByText(/Private colleague/)).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Signing out");
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    finish(new Response(null, { status: 204 }));
    expect(await screen.findByRole("button", { name: /^Sign in$/ })).toBeVisible();
    expect(fetcher.mock.calls[1][0]).toBe("/api/session/logout");
  });
  it("keeps an unconfirmed logout private across focus/restore and retries only on user action", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(data))
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    render(
      <SessionProviders config={{ appKey: "invoice" }} fetchFn={fetcher}>
        <Protected />
        <LogoutAction />
      </SessionProviders>
    );
    fireEvent.click(await screen.findByRole("button", { name: "Sign out of Corely" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign-out could not be confirmed");
    fireEvent.focus(window);
    fireEvent(window, new Event("pageshow"));
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/Private colleague/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry sign out" }));
    expect(await screen.findByRole("button", { name: /^Sign in$/ })).toBeVisible();
    expect(fetcher.mock.calls.filter(([url]) => url === "/api/session/logout")).toHaveLength(2);
  });
  it("revalidates a restored page before remounting private content", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(data))
      .mockResolvedValueOnce(json({}, 401));
    render(
      <SessionProviders config={{ appKey: "invoice" }} fetchFn={fetcher}>
        <Protected />
      </SessionProviders>
    );
    await screen.findByText(/Private colleague/);
    fireEvent(window, new Event("pageshow"));
    expect(screen.queryByText(/Private colleague/)).toBeNull();
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign in to continue");
  });
});

describe("idle and history privacy", () => {
  it("removes DOM before a history snapshot and verifies again on restore", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(data))
      .mockResolvedValueOnce(json({}, 401));
    render(
      <SessionProviders config={{ appKey: "invoice" }} fetchFn={fetcher}>
        <Protected />
      </SessionProviders>
    );
    await screen.findByText(/Private colleague/);
    fireEvent(window, new Event("pagehide"));
    expect(screen.queryByText(/Private colleague/)).toBeNull();
    fireEvent(window, new Event("pageshow"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign in to continue");
  });
  it("closes an idle tab on revoked membership and does not poll it back into a session", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(data))
      .mockResolvedValueOnce(json({}, 403));
    vi.useFakeTimers();
    render(
      <SessionProviders config={{ appKey: "invoice" }} fetchFn={fetcher}>
        <Protected />
      </SessionProviders>
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    try {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(screen.queryByText(/Private colleague/)).toBeNull();
      expect(screen.getByRole("alert")).toHaveTextContent("You do not have access");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
  it("hides an idle page if its verification connection hangs", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(data))
      .mockImplementationOnce(() => new Promise(() => {}));
    vi.useFakeTimers();
    render(
      <SessionProviders config={{ appKey: "invoice" }} fetchFn={fetcher}>
        <Protected />
      </SessionProviders>
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    try {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(40_000);
      });
      expect(screen.queryByText(/Private colleague/)).toBeNull();
      expect(screen.getByRole("alert")).toHaveTextContent("temporarily unavailable");
    } finally {
      vi.useRealTimers();
    }
  });
});
