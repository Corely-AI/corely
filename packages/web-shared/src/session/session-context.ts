import { createContext, useContext } from "react";
import type { SsoSessionUser } from "@corely/contracts";
import type { SessionClient, SessionFailure } from "./session-client";
export type BrowserSessionState =
  | { status: "booting" | "signingOut" | "logoutFailed" | "migrationBlocked" }
  | { status: "authenticated"; session: SsoSessionUser }
  | { status: SessionFailure };
export interface BrowserSessionContext {
  state: BrowserSessionState;
  client: SessionClient;
  retry: () => Promise<void>;
  login: (returnPath?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}
export const SessionContext = createContext<BrowserSessionContext | undefined>(undefined);
export function useSession(): BrowserSessionContext {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession requires SessionProviders");
  }
  return value;
}
