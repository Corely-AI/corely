import type { CompleteUploadUseCase } from "./use-cases/complete-upload/complete-upload.usecase";
import type { CreateUploadIntentUseCase } from "./use-cases/create-upload-intent/create-upload-intent.usecase";
import type { GetDownloadUrlUseCase } from "./use-cases/get-download-url/get-download-url.usecase";
import type { GetDocumentUseCase } from "./use-cases/get-document/get-document.usecase";
import type { GetPublicFileUrlUseCase } from "./use-cases/get-public-file-url/get-public-file-url.usecase";
import type { LinkDocumentUseCase } from "./use-cases/link-document/link-document.usecase";
import type { ListLinkedDocumentsUseCase } from "./use-cases/list-linked-documents/list-linked-documents.usecase";
import type { RequestInvoicePdfUseCase } from "./use-cases/request-invoice-pdf/request-invoice-pdf.usecase";
import type { UnlinkDocumentUseCase } from "./use-cases/unlink-document/unlink-document.usecase";
import type { UploadFileUseCase } from "./use-cases/upload-file/upload-file.usecase";
import type { ProxyDownloadUseCase } from "./use-cases/proxy-download/proxy-download.usecase";

export class DocumentsApplication {
  constructor(
    public readonly createUploadIntent: CreateUploadIntentUseCase,
    public readonly completeUpload: CompleteUploadUseCase,
    public readonly getDownloadUrl: GetDownloadUrlUseCase,
    public readonly getDocument: GetDocumentUseCase,
    public readonly getPublicFileUrl: GetPublicFileUrlUseCase,
    public readonly linkDocument: LinkDocumentUseCase,
    public readonly listLinkedDocuments: ListLinkedDocumentsUseCase,
    public readonly requestInvoicePdf: RequestInvoicePdfUseCase,
    public readonly unlinkDocument: UnlinkDocumentUseCase,
    public readonly uploadFile: UploadFileUseCase,
    public readonly proxyDownload: ProxyDownloadUseCase
  ) {}
}
