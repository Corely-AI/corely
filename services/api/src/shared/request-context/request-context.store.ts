import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestContext } from "./request-context.types";

const als = new AsyncLocalStorage<RequestContext>();

export const runWithRequestContext = <T>(ctx: RequestContext, fn: () => T): T => {
  return als.run(ctx, fn);
};

export const getRequestContext = (): RequestContext | undefined => als.getStore();
