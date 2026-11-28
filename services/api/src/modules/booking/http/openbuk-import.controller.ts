import {
  BadRequestException,
  Body,
  Controller,
  Header,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { ZodError } from "zod";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { buildUseCaseContext } from "../../../shared/http/usecase-mappers";
import type { OpenBukImportResult } from "@corely/contracts";
import { OpenBukImportUseCase } from "../application/use-cases/openbuk-import.usecase";

@Controller("openbuk/import")
@UseGuards(AuthGuard)
export class OpenBukImportController {
  constructor(private readonly app: OpenBukImportUseCase) {}

  @Post("preview")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  preview(@Body() input: unknown, @Req() request: Request) {
    return this.parse(() => this.app.preview(input, buildUseCaseContext(request)));
  }

  @Post("apply")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  apply(@Body() input: unknown, @Req() request: Request) {
    return this.parse(() => this.app.apply(input, buildUseCaseContext(request)));
  }

  private async parse(work: () => Promise<OpenBukImportResult>) {
    try {
      return await work();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException("Invalid import batch");
      }
      throw error;
    }
  }
}
