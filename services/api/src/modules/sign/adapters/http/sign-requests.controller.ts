import {
  CreateSignRequestDraftUseCase,
  EditSignRequestDraftUseCase,
  GetSignRequestUseCase,
  ListSignRequestsUseCase,
} from "../../application/use-cases";
import {
  Controller,
  Get,
  Post,
  Put,
  Req,
  Query,
  Param,
  Body,
  Header,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import {
  toAuthenticatedWorkspaceContext,
  type ContextAwareRequest,
} from "../../../../shared/request-context";
import { resolveIdempotencyKey } from "../../../../shared/http/usecase-mappers";
@Controller("sign/requests")
@UseGuards(AuthGuard)
export class SignRequestsController {
  constructor(
    private readonly listSignRequests: ListSignRequestsUseCase,
    private readonly getSignRequest: GetSignRequestUseCase,
    private readonly createSignRequestDraft: CreateSignRequestDraftUseCase,
    private readonly editSignRequestDraft: EditSignRequestDraftUseCase
  ) {}
  @Get()
  @Header("Cache-Control", "private, no-store")
  list(
    @Req() req: ContextAwareRequest,
    @Query("cursor") cursor?: string,
    @Query("status") status?: string,
    @Query("q") q?: string
  ) {
    return this.listSignRequests.execute(toAuthenticatedWorkspaceContext(req), cursor, {
      status,
      q,
    });
  }
  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  get(@Req() req: ContextAwareRequest, @Param("id") id: string) {
    return this.getSignRequest.execute(toAuthenticatedWorkspaceContext(req), id);
  }
  @Put(":id")
  @Header("Cache-Control", "private, no-store")
  update(@Req() req: ContextAwareRequest, @Param("id") id: string, @Body() body: unknown) {
    return this.editSignRequestDraft.update(toAuthenticatedWorkspaceContext(req), id, body);
  }
  @Post(":id/replacement")
  @Header("Cache-Control", "private, no-store")
  replace(@Req() req: ContextAwareRequest, @Param("id") id: string) {
    return this.editSignRequestDraft.replace(toAuthenticatedWorkspaceContext(req), id);
  }
  @Post()
  @Header("Cache-Control", "private, no-store")
  create(@Req() req: ContextAwareRequest, @Body() body: unknown) {
    return this.createSignRequestDraft.execute(
      toAuthenticatedWorkspaceContext(req),
      body,
      resolveIdempotencyKey(req)
    );
  }
}
