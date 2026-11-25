import React, { act, createContext, useContext } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuestOnly } from "./guest-only";

const TestAuthContext = createContext({ isAuthenticated: false, isLoading: true });

vi.mock("@/lib/auth-provider", () => ({ useAuth: () => useContext(TestAuthContext) }));

function openAuthPage(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: <GuestOnly />,
        children: [
          { path: "/auth/login", element: <input aria-label="Login email" /> },
          { path: "/auth/signup", element: <input aria-label="Signup email" /> },
        ],
      },
      { path: "/dashboard", element: <h1>Dashboard</h1> },
      { path: "/previous", element: <h1>Previous page</h1> },
    ],
    { initialEntries: ["/previous", path] }
  );
  const withAuth = (value: React.ContextType<typeof TestAuthContext>) => (
    <TestAuthContext.Provider value={value}>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </TestAuthContext.Provider>
  );
  const view = render(withAuth({ isAuthenticated: false, isLoading: true }));

  return {
    router,
    updateAuth(next: React.ContextType<typeof TestAuthContext>) {
      view.rerender(withAuth(next));
    },
  };
}

afterEach(cleanup);

describe("GuestOnly", () => {
  it.each(["/auth/login", "/auth/signup"])(
    "waits for a session and replaces %s with the dashboard when already signed in",
    async (path) => {
      const { router, updateAuth } = openAuthPage(path);
      expect(router.state.location.pathname).toBe(path);
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

      updateAuth({ isAuthenticated: true, isLoading: false });
      expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

      await act(() => router.navigate(-1));
      expect(screen.getByRole("heading", { name: "Previous page" })).toBeInTheDocument();
    }
  );

  it.each([
    ["/auth/login", "Login email"],
    ["/auth/signup", "Signup email"],
  ])("lets %s handle its own navigation after a guest signs in or signs up", (path, label) => {
    const { router, updateAuth } = openAuthPage(path);

    updateAuth({ isAuthenticated: false, isLoading: false });
    expect(screen.getByRole("textbox", { name: label })).toBeInTheDocument();

    updateAuth({ isAuthenticated: true, isLoading: false });
    expect(screen.getByRole("textbox", { name: label })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(path);
  });
});
