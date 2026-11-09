import { createContext, useContext, useCallback, useLayoutEffect } from "react";
import {
  useNavigate,
  type NavigateFunction,
  type To,
  type NavigateOptions,
} from "react-router-dom";
import {
  invoicesApi as legacyInvoicesApi,
  type InvoicesApi,
} from "@corely/web-shared/lib/invoices-api";
import { customersApi as legacyCustomersApi } from "@corely/web-shared/lib/customers-api";
import {
  paymentMethodsApi as legacyPaymentMethodsApi,
  type PaymentMethodsApi,
} from "@corely/web-shared/lib/payment-methods-api";
import { useOptionalWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { createWorkspaceQueryKeys } from "@corely/web-shared/shared/workspaces/workspace-query-keys";
import {
  sessionScopeQueryKey,
  type SessionWorkspaceScope,
} from "@corely/web-shared/session/workspace-launch";

export interface InvoiceRuntime {
  invoices: InvoicesApi;
  customers: typeof legacyCustomersApi;
  paymentMethods: PaymentMethodsApi;
  scope: SessionWorkspaceScope;
  workspace: { id: string; name: string; legalEntityId?: string };
  route: (path: string) => string;
  registerDraft: (key: string, dirty: boolean) => void;
}
const Context = createContext<InvoiceRuntime | undefined>(undefined);
export const InvoiceRuntimeProvider = Context.Provider;
export const useInvoiceRuntime = () => useContext(Context);
export const useInvoicesApi = () => useInvoiceRuntime()?.invoices ?? legacyInvoicesApi;
export const useInvoiceCustomersApi = () => useInvoiceRuntime()?.customers ?? legacyCustomersApi;
export const useInvoicePaymentMethodsApi = () =>
  useInvoiceRuntime()?.paymentMethods ?? legacyPaymentMethodsApi;
export function useInvoiceWorkspace() {
  const runtime = useInvoiceRuntime();
  const legacy = useOptionalWorkspace();
  return { activeWorkspace: runtime?.workspace ?? legacy?.activeWorkspace };
}
export function useInvoiceKeys(resource = "invoices") {
  const runtime = useInvoiceRuntime();
  if (!runtime) {
    return createWorkspaceQueryKeys(resource);
  }
  return {
    all: () => sessionScopeQueryKey(runtime.scope, resource),
    list: (filters?: unknown) =>
      sessionScopeQueryKey(runtime.scope, resource, "list", filters ?? {}),
    detail: (id: string) => sessionScopeQueryKey(runtime.scope, resource, "detail", id),
  };
}
export function useInvoiceNavigate(): NavigateFunction {
  const navigate = useNavigate();
  const runtime = useInvoiceRuntime();
  return useCallback(
    ((to: To | number, options?: NavigateOptions) => {
      if (typeof to === "number") {
        navigate(to);
        return;
      }
      if (!runtime) {
        navigate(to, options);
        return;
      }
      const path =
        typeof to === "string"
          ? to
          : `${to.pathname ?? "/invoices"}${to.search ?? ""}${to.hash ?? ""}`;
      navigate(runtime.route(path), options);
    }) as NavigateFunction,
    [navigate, runtime]
  );
}
export function useInvoiceDraftGuard(key: string, dirty: boolean) {
  const runtime = useInvoiceRuntime();
  useLayoutEffect(() => {
    runtime?.registerDraft(key, dirty);
    return () => runtime?.registerDraft(key, false);
  }, [runtime?.registerDraft, key, dirty]);
}
