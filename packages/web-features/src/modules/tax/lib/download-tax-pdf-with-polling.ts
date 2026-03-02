import { pollAsyncJob } from "@corely/web-shared/shared/lib/async-poll";
import type { TaxPdfResponse } from "@corely/web-shared/lib/tax-api";

const TAX_PDF_WAIT_PER_REQUEST_MS = 15000;
const TAX_PDF_MAX_WAIT_TOTAL_MS = 90000;
const TAX_PDF_RETRY_AFTER_MIN_MS = 500;
const TAX_PDF_RETRY_AFTER_MAX_MS = 5000;

export type TaxPdfPollingResult =
  | { status: "READY"; downloadUrl: string }
  | { status: "PENDING" }
  | { status: "ABORTED" };

export async function downloadTaxPdfWithPolling(
  request: (signal: AbortSignal) => Promise<TaxPdfResponse>,
  signal?: AbortSignal
): Promise<TaxPdfPollingResult> {
  const pollResult = await pollAsyncJob({
    maxTotalWaitMs: TAX_PDF_MAX_WAIT_TOTAL_MS,
    perRequestWaitMs: TAX_PDF_WAIT_PER_REQUEST_MS,
    minRetryAfterMs: TAX_PDF_RETRY_AFTER_MIN_MS,
    maxRetryAfterMs: TAX_PDF_RETRY_AFTER_MAX_MS,
    signal,
    request: async ({ signal: requestSignal }) => request(requestSignal),
    isTerminal: (response) => response.status === "READY",
  });

  if (pollResult.status === "ABORTED") {
    return { status: "ABORTED" };
  }

  if (pollResult.status === "TERMINAL" && pollResult.response?.downloadUrl) {
    return {
      status: "READY",
      downloadUrl: pollResult.response.downloadUrl,
    };
  }

  return { status: "PENDING" };
}
