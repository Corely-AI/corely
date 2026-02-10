import {
  BaseUseCase,
  type LoggerPort,
  RequireTenant,
  ValidationError,
  isErr,
  ok,
  type ObjectStoragePort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
} from "@corely/kernel";
import { type DocumentRepoPort } from "../../ports/document-repository.port";
import { type FileRepoPort } from "../../ports/file-repository.port";
import { type RequestInvoicePdfUseCase } from "../request-invoice-pdf/request-invoice-pdf.usecase";

export type GetInvoicePdfInput = {
  invoiceId: string;
  forceRegenerate?: boolean;
  waitMs?: number;
  abortSignal?: AbortSignal;
};

export type GetInvoicePdfOutput = {
  documentId?: string;
  fileId?: string;
  status: "PENDING" | "READY" | "FAILED";
  downloadUrl?: string;
  expiresAt?: string;
  errorMessage?: string;
  retryAfterMs?: number;
};

type Deps = {
  logger: LoggerPort;
  requestInvoicePdf: RequestInvoicePdfUseCase;
  documentRepo: DocumentRepoPort;
  fileRepo: FileRepoPort;
  objectStorage: ObjectStoragePort;
  downloadTtlSeconds: number;
  defaultWaitMs: number;
  maxWaitMs: number;
  pollInitialMs: number;
  pollMaxMs: number;
  pollJitterMs: number;
  pendingRetryAfterMs: number;
};

@RequireTenant()
export class GetInvoicePdfUseCase extends BaseUseCase<GetInvoicePdfInput, GetInvoicePdfOutput> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected validate(input: GetInvoicePdfInput): GetInvoicePdfInput {
    if (!input.invoiceId) {
      throw new ValidationError("invoiceId is required");
    }
    return input;
  }

  protected async handle(
    input: GetInvoicePdfInput,
    ctx: UseCaseContext
  ): Promise<Result<GetInvoicePdfOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const waitMs = this.resolveWaitMs(input.waitMs);

    const requestResult = await this.deps.requestInvoicePdf.execute(
      {
        invoiceId: input.invoiceId,
        forceRegenerate: input.forceRegenerate,
      },
      ctx
    );
    if (isErr(requestResult)) {
      return requestResult;
    }

    const requested = requestResult.value;
    if (requested.status === "READY") {
      return ok({
        documentId: requested.documentId,
        fileId: requested.fileId,
        status: "READY",
        downloadUrl: requested.downloadUrl,
        expiresAt: requested.expiresAt,
      });
    }

    if (waitMs <= 0 || input.abortSignal?.aborted) {
      return ok({
        documentId: requested.documentId,
        fileId: requested.fileId,
        status: "PENDING",
        retryAfterMs: this.deps.pendingRetryAfterMs,
      });
    }

    const deadline = Date.now() + waitMs;
    let pollDelayMs = this.deps.pollInitialMs;

    while (Date.now() < deadline) {
      if (input.abortSignal?.aborted) {
        return ok({
          documentId: requested.documentId,
          fileId: requested.fileId,
          status: "PENDING",
          retryAfterMs: this.deps.pendingRetryAfterMs,
        });
      }

      const current = await this.getCurrentPdfState(tenantId, input.invoiceId);
      if (current.status === "READY" || current.status === "FAILED") {
        return ok(current);
      }

      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        break;
      }

      const jitterMs =
        this.deps.pollJitterMs > 0 ? Math.floor(Math.random() * (this.deps.pollJitterMs + 1)) : 0;
      const sleepMs = Math.min(remainingMs, pollDelayMs + jitterMs);
      await this.sleep(sleepMs, input.abortSignal);
      pollDelayMs = Math.min(this.deps.pollMaxMs, Math.ceil(pollDelayMs * 1.5));
    }

    const current = await this.getCurrentPdfState(tenantId, input.invoiceId);
    if (current.status === "READY" || current.status === "FAILED") {
      return ok(current);
    }

    return ok({
      documentId: current.documentId ?? requested.documentId,
      fileId: current.fileId ?? requested.fileId,
      status: "PENDING",
      retryAfterMs: this.deps.pendingRetryAfterMs,
    });
  }

  private resolveWaitMs(rawWaitMs: number | undefined): number {
    const candidate = Number.isFinite(rawWaitMs) ? Math.floor(rawWaitMs as number) : undefined;
    const waitMs = candidate ?? this.deps.defaultWaitMs;
    return Math.max(0, Math.min(this.deps.maxWaitMs, waitMs));
  }

  private async getCurrentPdfState(
    tenantId: string,
    invoiceId: string
  ): Promise<GetInvoicePdfOutput> {
    const document = await this.deps.documentRepo.findByTypeAndEntityLink(
      tenantId,
      "INVOICE_PDF",
      "INVOICE",
      invoiceId
    );

    if (!document) {
      return { status: "PENDING", retryAfterMs: this.deps.pendingRetryAfterMs };
    }

    const generatedFile =
      (await this.deps.fileRepo.findByDocumentAndKind(tenantId, document.id, "GENERATED")) ??
      (await this.deps.fileRepo.findByDocument(tenantId, document.id)).find(
        (file) => file.kind === "GENERATED"
      ) ??
      null;

    if (document.status === "FAILED") {
      return {
        documentId: document.id,
        fileId: generatedFile?.id,
        status: "FAILED",
        errorMessage: document.errorMessage ?? "PDF generation failed",
      };
    }

    if (document.status === "READY" && generatedFile) {
      const signed = await this.deps.objectStorage.createSignedDownloadUrl({
        tenantId,
        objectKey: generatedFile.objectKey,
        expiresInSeconds: this.deps.downloadTtlSeconds,
      });
      return {
        documentId: document.id,
        fileId: generatedFile.id,
        status: "READY",
        downloadUrl: signed.url,
        expiresAt: signed.expiresAt.toISOString(),
      };
    }

    return {
      documentId: document.id,
      fileId: generatedFile?.id,
      status: "PENDING",
      retryAfterMs: this.deps.pendingRetryAfterMs,
    };
  }

  private async sleep(ms: number, signal?: AbortSignal): Promise<void> {
    if (ms <= 0 || signal?.aborted) {
      return;
    }

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, ms);

      const onAbort = () => {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", onAbort);
        resolve();
      };

      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
}
