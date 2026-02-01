import type { CreateInventoryDocumentUseCase } from "./use-cases/create-inventory-document.usecase";
import type { UpdateInventoryDocumentUseCase } from "./use-cases/update-inventory-document.usecase";
import type { ConfirmInventoryDocumentUseCase } from "./use-cases/confirm-inventory-document.usecase";
import type { PostInventoryDocumentUseCase } from "./use-cases/post-inventory-document.usecase";
import type { CancelInventoryDocumentUseCase } from "./use-cases/cancel-inventory-document.usecase";
import type { GetInventoryDocumentUseCase } from "./use-cases/get-inventory-document.usecase";
import type { ListInventoryDocumentsUseCase } from "./use-cases/list-inventory-documents.usecase";

export class InventoryDocumentsApplication {
  constructor(
    public readonly createDocument: CreateInventoryDocumentUseCase,
    public readonly updateDocument: UpdateInventoryDocumentUseCase,
    public readonly confirmDocument: ConfirmInventoryDocumentUseCase,
    public readonly postDocument: PostInventoryDocumentUseCase,
    public readonly cancelDocument: CancelInventoryDocumentUseCase,
    public readonly getDocument: GetInventoryDocumentUseCase,
    public readonly listDocuments: ListInventoryDocumentsUseCase
  ) {}
}
