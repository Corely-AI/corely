import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  GetPublicFormInputSchema,
  GetPublicFormOutputSchema,
  PublicSubmitInputSchema,
  PublicSubmitOutputSchema,
} from "@corely/contracts";
import { buildUseCaseContext } from "../../../shared/http/usecase-mappers";
import { PublicGetFormUseCase } from "../application/use-cases/public-get-form.usecase";
import { PublicSubmitFormUseCase } from "../application/use-cases/public-submit-form.usecase";

@Controller("public/forms")
export class PublicFormsController {
  constructor(
    private readonly publicGetFormUseCase: PublicGetFormUseCase,
    private readonly publicSubmitFormUseCase: PublicSubmitFormUseCase
  ) {}

  @Get(":publicId")
  async getPublicForm(@Param("publicId") publicId: string, @Req() req: Request) {
    const input = GetPublicFormInputSchema.parse({ publicId });
    const ctx = buildUseCaseContext(req);
    const form = await this.publicGetFormUseCase.execute(input.publicId, ctx);
    return GetPublicFormOutputSchema.parse({ form });
  }

  @Post(":publicId/submissions")
  async submit(@Param("publicId") publicId: string, @Body() body: unknown, @Req() req: Request) {
    const input = PublicSubmitInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const submission = await this.publicSubmitFormUseCase.execute(publicId, input, ctx);
    return PublicSubmitOutputSchema.parse({ submission });
  }
}
