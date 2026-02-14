import { Injectable } from "@nestjs/common";
import type { Request } from "express";
import { fromEvent } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { createPollingSseStream } from "./create-polling-sse-stream";
import type { SsePollingStreamOptions, TypedSseMessage } from "./sse.types";

@Injectable()
export class SseStreamFactory {
  createPollingStream<TSnapshot, TPayload = TSnapshot>(
    request: Request,
    options: SsePollingStreamOptions<TSnapshot, TPayload>
  ) {
    const disconnected$ = fromEvent(request, "close");
    return createPollingSseStream(options).pipe(takeUntil(disconnected$));
  }

  toEvent<TData extends string | object>(type: string, data: TData): TypedSseMessage<TData> {
    return {
      type,
      data,
    };
  }
}
