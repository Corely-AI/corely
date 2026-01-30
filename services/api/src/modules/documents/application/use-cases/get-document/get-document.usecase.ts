import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ValidationError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { type DocumentDTO } from "@corely/contracts";
import { type DocumentRepoPort } from "../../ports/document-repository.port";
import { type FileRepoPort } from "../../ports/file-repository.port";
import { toDocumentDto } from "../../mappers/document.mapper";

type GetDocumentInput = { documentId: string };
type GetDocumentOutput = { document: DocumentDTO };

type Deps = {
  logger: LoggerPort;
  documentRepo: DocumentRepoPort;
  fileRepo: FileRepoPort;
};

@RequireTenant()
export class GetDocumentUseCase extends BaseUseCase<GetDocumentInput, GetDocumentOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: GetDocumentInput): GetDocumentInput {
    if (!input.documentId) {
      throw new ValidationError("documentId is required");
    }
    return input;
  }

  protected async handle(
    input: GetDocumentInput,
    ctx: UseCaseContext
  ): Promise<Result<GetDocumentOutput, UseCaseError>> {
    const document = await this.useCaseDeps.documentRepo.findById(ctx.tenantId, input.documentId);
    if (!document) {
      return err(new NotFoundError("Document not found"));
    }
    const files = await this.useCaseDeps.fileRepo.findByDocument(ctx.tenantId, document.id);
    return ok({ document: toDocumentDto(document, files) });
  }
}
