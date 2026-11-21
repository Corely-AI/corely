import {
  ArchiveSignTemplateUseCase,
  AttachSignTemplateSourceUseCase,
  GetSignTemplateUseCase,
  ListSignTemplatesUseCase,
  PublishSignTemplateUseCase,
  ReadSignTemplateSourceUseCase,
  SaveSignTemplateUseCase,
} from "../../application/use-cases";
import { Body, Controller, Get, Query, Param, Put, Req, UseGuards, Header } from "@nestjs/common";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { toAuthenticatedWorkspaceContext, type ContextAwareRequest } from "../../../../shared/request-context";
import { resolveIdempotencyKey } from "../../../../shared/http/usecase-mappers";

@Controller("sign/templates")
@UseGuards(AuthGuard)
export class SignTemplatesController {
  constructor(
    private readonly archiveSignTemplate: ArchiveSignTemplateUseCase,
    private readonly listSignTemplates: ListSignTemplatesUseCase,
    private readonly getSignTemplate: GetSignTemplateUseCase,
    private readonly saveSignTemplate: SaveSignTemplateUseCase,
    private readonly publishSignTemplate: PublishSignTemplateUseCase,
    private readonly attachSignTemplateSource: AttachSignTemplateSourceUseCase,
    private readonly readSignTemplateSource: ReadSignTemplateSourceUseCase
  ) {}
  @Get()
  @Header("Cache-Control", "private, no-store")
  list(@Req() req: ContextAwareRequest, @Query("cursor") cursor?: string) {
    return this.listSignTemplates.execute(toAuthenticatedWorkspaceContext(req), cursor);
  }
  @Put(":id/versions/:revision")
  @Header("Cache-Control", "private, no-store")
  publish(
    @Req() req: ContextAwareRequest,
    @Param("id") id: string,
    @Param("revision") revision: string
  ) {
    return this.publishSignTemplate.execute(toAuthenticatedWorkspaceContext(req), id, {
      revision: Number(revision),
    });
  }
  @Get(":id/source")
  @Header("Cache-Control", "private, no-store")
  readSource(@Req() req: ContextAwareRequest, @Param("id") id: string) {
    return this.readSignTemplateSource.execute(toAuthenticatedWorkspaceContext(req), id);
  }
  @Put(":id/source")
  @Header("Cache-Control", "private, no-store")
  attachSource(@Req() req: ContextAwareRequest, @Param("id") id: string, @Body() input: unknown) {
    return this.attachSignTemplateSource.execute(toAuthenticatedWorkspaceContext(req), id, input);
  }
  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  get(@Req() req: ContextAwareRequest, @Param("id") id: string) {
    return this.getSignTemplate.execute(toAuthenticatedWorkspaceContext(req), id);
  }
  @Put(":id/archive")
  @Header("Cache-Control", "private, no-store")
  archive(@Req() req: ContextAwareRequest, @Param("id") id: string, @Body() input: unknown) {
    return this.archiveSignTemplate.execute(
      toAuthenticatedWorkspaceContext(req),
      id,
      resolveIdempotencyKey(req),
      input
    );
  }
  @Put(":id")
  @Header("Cache-Control", "private, no-store")
  save(@Req() req: ContextAwareRequest, @Param("id") id: string, @Body() body: unknown) {
    return this.saveSignTemplate.execute(
      toAuthenticatedWorkspaceContext(req),
      id,
      resolveIdempotencyKey(req),
      body
    );
  }
}
