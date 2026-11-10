import { FocusedObservationSchema, type FocusedObservation } from "@corely/contracts";

export type FocusedObservationSink = (event: FocusedObservation) => void;
let sink: FocusedObservationSink = (event) => console.info("corely.focused", event);
/** Bind an existing browser collector here. No credentials, URLs or arbitrary metadata enter it. */
export function installFocusedObservationSink(next: FocusedObservationSink): () => void {
  const previous = sink;
  sink = next;
  return () => {
    if (sink === next) {
      sink = previous;
    }
  };
}
export function observeFocused(input: unknown): void {
  const parsed = FocusedObservationSchema.safeParse(input);
  if (!parsed.success) {
    return;
  }
  try {
    sink(parsed.data);
  } catch {
    /* Diagnostics must never break a user action. */
  }
}
