import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { resolveRequestContext } from "./request-context.resolver";
import { PublicWorkspaceResolver, PUBLIC_WORKSPACE_ROUTE_KEY } from "../public";

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly publicWorkspaceResolver: PublicWorkspaceResolver
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();

    const isPublicRoute = this.reflector.getAllAndOverride<boolean>(PUBLIC_WORKSPACE_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublicRoute && !req.user?.userId && !req.publicContext) {
      return new Observable((subscriber) => {
        this.publicWorkspaceResolver
          .resolve(req)
          .then((publicContext) => {
            req.publicContext = publicContext;
            resolveRequestContext(req);
            return next.handle().subscribe(subscriber);
          })
          .catch((error) => subscriber.error(error));
      });
    }

    resolveRequestContext(req);

    return next.handle();
  }
}
