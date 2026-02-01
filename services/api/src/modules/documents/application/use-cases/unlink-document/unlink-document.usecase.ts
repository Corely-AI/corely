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
import { type DocumentLinkEntityType } from "@corely/contracts";
import { type DocumentLinkRepoPort } from "../../ports/document-link.port";

type UnlinkDocumentInput = {
  documentId: string;
  entityType: DocumentLinkEntityType;
  entityId: string;
};
type UnlinkDocumentOutput = { removed: boolean };

type Deps = {
  logger: LoggerPort;
  linkRepo: DocumentLinkRepoPort;
};

@RequireTenant()
export class UnlinkDocumentUseCase extends BaseUseCase<UnlinkDocumentInput, UnlinkDocumentOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: UnlinkDocumentInput): UnlinkDocumentInput {
    if (!input.documentId || !input.entityId) {
      throw new ValidationError("documentId and entityId are required");
    }
    return input;
  }

  protected async handle(
    input: UnlinkDocumentInput,
    ctx: UseCaseContext
  ): Promise<Result<UnlinkDocumentOutput, UseCaseError>> {
    await this.useCaseDeps.linkRepo.deleteLink({
      tenantId: ctx.tenantId,
      documentId: input.documentId,
      entityType: input.entityType,
      entityId: input.entityId,
    });
    return ok({ removed: true });
  }
}
