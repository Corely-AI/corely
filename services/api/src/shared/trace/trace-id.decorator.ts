import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

/**
 * Decorator to extract trace ID from request
 *
 * @example
 * ```ts
 * @Get('/example')
 * exampleEndpoint(@TraceId() traceId: string) {
 *   // Use traceId in your handler
 * }
 * ```
 */
export const TraceId = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return request.traceId || "unknown";
});
