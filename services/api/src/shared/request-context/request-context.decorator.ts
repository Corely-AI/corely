import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { RequestContext } from "./request-context.types";

export const Ctx = createParamDecorator((data: unknown, ctx: ExecutionContext): RequestContext => {
  const request = ctx.switchToHttp().getRequest();
  return request.context as RequestContext;
});
