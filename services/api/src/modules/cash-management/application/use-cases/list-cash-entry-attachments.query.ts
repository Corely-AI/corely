import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  RequireTenant,
  ok,
} from "@corely/kernel";
import {
  CASH_ATTACHMENT_REPO,
  CASH_ENTRY_REPO,
  type CashAttachmentRepoPort,
  type CashEntryRepoPort,
} from "../ports/cash-management.ports";
import { toAttachmentDto } from "../cash-management.mapper";
import { assertCanManageCash } from "../../policies/assert-cash-policies";

@RequireTenant()
@Injectable()
export class ListCashEntryAttachmentsQueryUseCase extends BaseUseCase<
  { entryId: string },
  { attachments: ReturnType<typeof toAttachmentDto>[] }
> {
  constructor(
    @Inject(CASH_ENTRY_REPO)
    private readonly entryRepo: CashEntryRepoPort,
    @Inject(CASH_ATTACHMENT_REPO)
    private readonly attachmentRepo: CashAttachmentRepoPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: { entryId: string },
    ctx: UseCaseContext
  ): Promise<Result<{ attachments: ReturnType<typeof toAttachmentDto>[] }, UseCaseError>> {
    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const entry = await this.entryRepo.findEntryById(tenantId, workspaceId, input.entryId);
    if (!entry) {
      return ok({ attachments: [] });
    }

    assertCanManageCash(ctx, entry.registerId);

    const attachments = await this.attachmentRepo.listAttachments(
      tenantId,
      workspaceId,
      input.entryId
    );
    return ok({ attachments: attachments.map(toAttachmentDto) });
  }
}
