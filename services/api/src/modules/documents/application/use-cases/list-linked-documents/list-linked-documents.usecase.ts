import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { type DocumentDTO, type DocumentLinkEntityType } from "@corely/contracts";
import { type DocumentRepoPort } from "../../ports/document-repository.port";
import { type DocumentLinkRepoPort } from "../../ports/document-link.port";
import { type FileRepoPort } from "../../ports/file-repository.port";
import { toDocumentDto } from "../../mappers/document.mapper";

type ListLinkedDocumentsInput = { entityType: DocumentLinkEntityType; entityId: string };
type ListLinkedDocumentsOutput = { items: DocumentDTO[] };

type Deps = {
  logger: LoggerPort;
  documentRepo: DocumentRepoPort;
  linkRepo: DocumentLinkRepoPort;
  fileRepo: FileRepoPort;
};

@RequireTenant()
export class ListLinkedDocumentsUseCase extends BaseUseCase<
  ListLinkedDocumentsInput,
  ListLinkedDocumentsOutput
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: ListLinkedDocumentsInput): ListLinkedDocumentsInput {
    if (!input.entityId) {
      throw new ValidationError("entityId is required");
    }
    return input;
  }

  protected async handle(
    input: ListLinkedDocumentsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListLinkedDocumentsOutput, UseCaseError>> {
    const ids = await this.useCaseDeps.linkRepo.findDocumentIds({
      tenantId: ctx.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
    });
    if (ids.length === 0) {
      return ok({ items: [] });
    }
    const documents = await Promise.all(
      ids.map((id) => this.useCaseDeps.documentRepo.findById(ctx.tenantId, id))
    );
    const resolved = (
      await Promise.all(
        documents
          .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc))
          .map(async (doc) => {
            const files = await this.useCaseDeps.fileRepo.findByDocument(ctx.tenantId, doc.id);
            return toDocumentDto(doc, files);
          })
      )
    ).filter(Boolean);

    return ok({ items: resolved });
  }
}
