import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { GenerateCmsDraftInputSchema } from '@corely/contracts';
import { buildUseCaseContext, mapResultToHttp } from '../../../../shared/http/usecase-mappers';
import { AuthGuard } from '../../../identity';
import { CmsApplication } from '../../application/cms.application';

@Controller('cms/ai')
@UseGuards(AuthGuard)
export class CmsAiController {
 constructor(private readonly app: CmsApplication) {}

 @Post('draft')
 async generateDraft(@Body() body: unknown, @Req() req: Request) {
 const input = GenerateCmsDraftInputSchema.parse(body);
 const ctx = buildUseCaseContext(req);
 const result = await this.app.generateDraft.execute(input, ctx);
 return mapResultToHttp(result);
 }
}
