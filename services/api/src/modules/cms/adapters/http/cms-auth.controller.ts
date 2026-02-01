import { Body, Controller, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { CmsReaderLoginInputSchema, CmsReaderSignUpInputSchema } from "@corely/contracts";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { CmsApplication } from "../../application/cms.application";
import { PublicWorkspaceRoute } from "../../../../shared/public";

@Controller("public/cms/auth")
@PublicWorkspaceRoute()
export class CmsAuthController {
  constructor(private readonly app: CmsApplication) {}

  @Post("signup")
  async signup(@Body() body: unknown, @Req() req: Request) {
    const input = CmsReaderSignUpInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.signUpReader.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("login")
  async login(@Body() body: unknown, @Req() req: Request) {
    const input = CmsReaderLoginInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.signInReader.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
