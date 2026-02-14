import { useCallback, useEffect, useRef } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { invoicesApi } from "@/lib/invoices-api";
import { paymentMethodsApi } from "@/lib/payment-methods-api";
import { invoiceQueryKeys } from "../queries";

type InvoiceForPdf = {
  status?: string;
  legalEntityId?: string | null;
  paymentMethodId?: string | null;
};

type UseInvoicePdfDownloadParams = {
  id?: string;
  invoice?: InvoiceForPdf;
  activeWorkspaceLegalEntityId?: string;
  getPaymentMethodId: () => string | undefined;
  setPaymentMethodId: (paymentMethodId: string) => void;
  queryClient: QueryClient;
  t: (key: string) => string;
  debugEnabled: boolean;
};

type DownloadOptions = {
  forceRegenerate?: boolean;
};

const PDF_WAIT_PER_REQUEST_MS = 15000;
const PDF_MAX_WAIT_TOTAL_MS = 90000;
const PDF_RETRY_AFTER_MIN_MS = 500;
const PDF_RETRY_AFTER_MAX_MS = 5000;

export const useInvoicePdfDownload = ({
  id,
  invoice,
  activeWorkspaceLegalEntityId,
  getPaymentMethodId,
  setPaymentMethodId,
  queryClient,
  t,
  debugEnabled,
}: UseInvoicePdfDownloadParams) => {
  const downloadAbortRef = useRef<AbortController | null>(null);
  const downloadInFlightRef = useRef(false);

  const waitWithAbort = useCallback(async (ms: number, signal: AbortSignal) => {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);

      const onAbort = () => {
        clearTimeout(timeout);
        signal.removeEventListener("abort", onAbort);
        resolve();
      };

      signal.addEventListener("abort", onAbort, { once: true });
    });
  }, []);

  const logPdfDebug = useCallback(
    (message: string, meta?: Record<string, unknown>) => {
      if (!debugEnabled) {
        return;
      }
      if (meta) {
        console.debug(`[InvoicePDF] ${message}`, meta);
      } else {
        console.debug(`[InvoicePDF] ${message}`);
      }
    },
    [debugEnabled]
  );

  const ensureInvoicePdfDefaults = useCallback(async () => {
    if (!id || !invoice || invoice.status !== "DRAFT") {
      return;
    }

    const legalEntityId = invoice.legalEntityId ?? activeWorkspaceLegalEntityId;

    let paymentMethodId = getPaymentMethodId() ?? invoice.paymentMethodId ?? undefined;
    if (!paymentMethodId && legalEntityId) {
      const paymentMethods = await paymentMethodsApi.listPaymentMethods(legalEntityId);
      const selected =
        paymentMethods.paymentMethods.find((method) => method.isDefaultForInvoicing) ??
        paymentMethods.paymentMethods[0];
      paymentMethodId = selected?.id;
      if (paymentMethodId) {
        setPaymentMethodId(paymentMethodId);
      }
    }

    const headerPatch: {
      legalEntityId?: string;
      paymentMethodId?: string;
    } = {};

    if (legalEntityId) {
      headerPatch.legalEntityId = legalEntityId;
    }
    if (paymentMethodId) {
      headerPatch.paymentMethodId = paymentMethodId;
    }

    if (Object.keys(headerPatch).length === 0) {
      return;
    }

    logPdfDebug("Applying invoice PDF defaults before generation", {
      invoiceId: id,
      legalEntityId: headerPatch.legalEntityId,
      paymentMethodId: headerPatch.paymentMethodId,
    });

    await invoicesApi.updateInvoice(id, { headerPatch });
    await queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.detail(id) });
  }, [
    activeWorkspaceLegalEntityId,
    getPaymentMethodId,
    id,
    invoice,
    logPdfDebug,
    queryClient,
    setPaymentMethodId,
  ]);

  const downloadPdfWithWait = useCallback(
    async (invoiceId: string, options?: DownloadOptions) => {
      if (downloadInFlightRef.current) {
        const activeAbort = downloadAbortRef.current;
        if (!activeAbort || activeAbort.signal.aborted) {
          logPdfDebug("Detected stale in-flight lock, resetting", {
            invoiceId,
            hasAbortController: Boolean(activeAbort),
            aborted: activeAbort?.signal.aborted ?? null,
          });
          downloadInFlightRef.current = false;
          downloadAbortRef.current = null;
        }
      }

      if (downloadInFlightRef.current) {
        logPdfDebug("Skip duplicate click while download is in-flight", { invoiceId });
        return;
      }

      downloadInFlightRef.current = true;
      const abortController = new AbortController();
      downloadAbortRef.current = abortController;
      const loadingToastId = toast.loading(t("invoices.pdf.pendingTitle"), {
        description: t("invoices.pdf.pendingDescription"),
      });

      try {
        const startedAt = Date.now();
        let forceRegenerate = options?.forceRegenerate === true;
        logPdfDebug("Download flow started", {
          invoiceId,
          maxWaitMs: PDF_MAX_WAIT_TOTAL_MS,
          perRequestWaitMs: PDF_WAIT_PER_REQUEST_MS,
          forceRegenerate,
        });

        while (Date.now() - startedAt < PDF_MAX_WAIT_TOTAL_MS) {
          const elapsedMs = Date.now() - startedAt;
          const remainingMs = PDF_MAX_WAIT_TOTAL_MS - elapsedMs;
          const waitMs = Math.min(PDF_WAIT_PER_REQUEST_MS, remainingMs);
          logPdfDebug("Requesting invoice PDF", { invoiceId, elapsedMs, remainingMs, waitMs });

          const response = await invoicesApi.downloadInvoicePdf(invoiceId, {
            waitMs,
            signal: abortController.signal,
            forceRegenerate,
          });
          forceRegenerate = false;
          logPdfDebug("Received invoice PDF response", {
            invoiceId,
            status: response.status,
            retryAfterMs: response.retryAfterMs,
            hasDownloadUrl: Boolean(response.downloadUrl),
          });

          if (response.status === "READY" && response.downloadUrl) {
            logPdfDebug("PDF is ready, opening URL", {
              invoiceId,
              downloadUrl: response.downloadUrl,
            });
            const opened = window.open(response.downloadUrl, "_blank", "noopener,noreferrer");
            if (!opened) {
              logPdfDebug("Popup likely blocked while opening PDF", { invoiceId });
              toast.error(t("invoices.errors.downloadFailed"), {
                description: "Please allow pop-ups for this site and try again.",
              });
            }
            return;
          }

          const retryAfterMs = Math.max(
            PDF_RETRY_AFTER_MIN_MS,
            Math.min(PDF_RETRY_AFTER_MAX_MS, response.retryAfterMs ?? 1000)
          );
          logPdfDebug("PDF still pending, waiting before retry", {
            invoiceId,
            retryAfterMs,
          });
          await waitWithAbort(retryAfterMs, abortController.signal);
        }

        logPdfDebug("Download flow timed out", { invoiceId, maxWaitMs: PDF_MAX_WAIT_TOTAL_MS });
        toast.info(t("invoices.pdf.stillGeneratingTitle"), {
          description: t("invoices.pdf.stillGeneratingDescription"),
        });
      } catch (error) {
        if (abortController.signal.aborted) {
          logPdfDebug("Download flow aborted", { invoiceId });
          return;
        }
        const details =
          typeof error === "object" &&
          error !== null &&
          "body" in error &&
          typeof (error as { body?: { message?: string } }).body?.message === "string"
            ? (error as { body: { message: string } }).body.message
            : undefined;
        logPdfDebug("Download flow failed", {
          invoiceId,
          details,
          error,
        });
        console.error("Download PDF failed", error);
        toast.error(t("invoices.errors.downloadFailed"), {
          description: details,
        });
      } finally {
        toast.dismiss(loadingToastId);
        if (downloadAbortRef.current === abortController) {
          downloadAbortRef.current = null;
        }
        downloadInFlightRef.current = false;
        logPdfDebug("Download flow finished", { invoiceId });
      }
    },
    [logPdfDebug, t, waitWithAbort]
  );

  useEffect(() => {
    return () => {
      downloadAbortRef.current?.abort();
      logPdfDebug("Aborted download flow on unmount");
      downloadAbortRef.current = null;
      downloadInFlightRef.current = false;
    };
  }, [logPdfDebug]);

  return {
    downloadPdfWithWait,
    ensureInvoicePdfDefaults,
    logPdfDebug,
  };
};
