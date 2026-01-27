import {
 Injectable,
 CanActivate,
 ExecutionContext,
 UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { RequestPrincipal } from '../../../../shared/request-context';
import { CmsReaderTokenService } from '../../infrastructure/security/cms-reader-token.service';

type CmsReaderRequest = Request & {
 cmsReader?: {
 readerId: string;
 tenantId: string;
 workspaceId: string;
 email: string;
 displayName?: string | null;
 };
 tenantId?: string;
 workspaceId?: string | null;
 user?: RequestPrincipal;
};

@Injectable()
export class CmsReaderAuthGuard implements CanActivate {
 constructor(private readonly tokenService: CmsReaderTokenService) {}

 async canActivate(context: ExecutionContext): Promise<boolean> {
 const request = context.switchToHttp().getRequest<CmsReaderRequest>();
 const authHeader = request.headers.authorization;

 if (!authHeader) {
 throw new UnauthorizedException('Missing authorization header');
 }

 const parts = authHeader.split(' ');
 if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
 throw new UnauthorizedException('Invalid authorization header format');
 }

 const token = parts[1];
 const decoded = this.tokenService.verifyAccessToken(token);

 if (!decoded) {
 throw new UnauthorizedException('Invalid or expired token');
 }

 request.cmsReader = {
 readerId: decoded.readerId,
 tenantId: decoded.tenantId,
 workspaceId: decoded.workspaceId,
 email: decoded.email,
 displayName: decoded.displayName ?? null,
 };
 request.user = {
  userId: decoded.readerId,
  tenantId: decoded.tenantId,
  workspaceId: decoded.workspaceId,
  email: decoded.email,
  roleIds: [],
 };
 request.tenantId = decoded.tenantId;
 request.workspaceId = decoded.workspaceId;

 return true;
 }
}
