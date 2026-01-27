import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ListCmsCommentsInputSchema } from '@corely/contracts';
import { parseListQuery } from '../../../../shared/http/pagination';
import { buildUseCaseContext, mapResultToHttp } from '../../../../shared/http/usecase-mappers';
import { AuthGuard } from '../../../identity';
import { CmsApplication } from '../../application/cms.application';

@Controller('cms/comments')
@UseGuards(AuthGuard)
export class CmsCommentsController {
 constructor(private readonly app: CmsApplication) {}

 @Get()
 async list(@Query() query: Record<string, unknown>, @Req() req: Request) {
 const listQuery = parseListQuery(query, { defaultPageSize: 20 });
 const input = ListCmsCommentsInputSchema.parse({
 postId: typeof query.postId === 'string' ? query.postId : undefined,
 status: typeof query.status === 'string' ? query.status : undefined,
 page: listQuery.page,
 pageSize: listQuery.pageSize,
 });
 const ctx = buildUseCaseContext(req);
 const result = await this.app.listComments.execute(input, ctx);
 return mapResultToHttp(result);
 }

 @Post(':commentId/approve')
 async approve(@Param('commentId') commentId: string, @Req() req: Request) {
 const ctx = buildUseCaseContext(req);
 const result = await this.app.moderateComment.execute({ commentId, status: 'APPROVED' }, ctx);
 return mapResultToHttp(result);
 }

 @Post(':commentId/reject')
 async reject(@Param('commentId') commentId: string, @Req() req: Request) {
 const ctx = buildUseCaseContext(req);
 const result = await this.app.moderateComment.execute({ commentId, status: 'REJECTED' }, ctx);
 return mapResultToHttp(result);
 }

 @Post(':commentId/spam')
 async spam(@Param('commentId') commentId: string, @Req() req: Request) {
 const ctx = buildUseCaseContext(req);
 const result = await this.app.moderateComment.execute({ commentId, status: 'SPAM' }, ctx);
 return mapResultToHttp(result);
 }

 @Post(':commentId/delete')
 async delete(@Param('commentId') commentId: string, @Req() req: Request) {
 const ctx = buildUseCaseContext(req);
 const result = await this.app.moderateComment.execute({ commentId, status: 'DELETED' }, ctx);
 return mapResultToHttp(result);
 }
}
