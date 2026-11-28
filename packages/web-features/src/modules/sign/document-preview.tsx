"use client";
import { useEffect, useRef, useState } from "react";
import type { SignRecipientMessages } from "@corely/web-shared/shared/i18n/sign-recipient";
import type * as PDFJS from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { signFieldPosition, type SignField } from "@corely/contracts";
import { Button, LoadingSkeleton, Skeleton } from "@corely/ui";

export interface SigningPdfAssets {
  moduleUrl: string;
  workerUrl: string;
}

export function DocumentPreview({
  source,
  fields,
  messages,
  assets: { moduleUrl, workerUrl },
}: {
  source: string;
  fields: SignField[];
  messages: SignRecipientMessages;
  assets: SigningPdfAssets;
}) {
  const [doc, setDoc] = useState<PDFDocumentProxy>(),
    [page, setPage] = useState(1),
    [error, setError] = useState<"documentUnavailable" | "pageRenderFailed">();
  const [rendered, setRendered] = useState<{ doc: PDFDocumentProxy; page: number }>();
  const [attempt, setAttempt] = useState(0);
  const ready = Boolean(doc && rendered?.doc === doc && rendered.page === page);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let closed = false,
      dispose = () => {};
    setDoc(undefined);
    setRendered(undefined);
    setError(undefined);
    async function load() {
      const module = new URL(moduleUrl, location.origin);
      if (attempt) {
        // Retry module fetches that the browser may have cached as failures.
        module.searchParams.set("retry", String(attempt));
      }
      const { getDocument, GlobalWorkerOptions } = (await import(
        /* @vite-ignore */ /* webpackIgnore: true */ module.href
      )) as typeof PDFJS;
      if (closed) {
        return;
      }
      GlobalWorkerOptions.workerSrc = workerUrl;
      const task = getDocument({
        data: Uint8Array.from(atob(source), (c) => c.charCodeAt(0)),
        useSystemFonts: false,
        stopAtErrors: true,
      });
      dispose = () => {
        void task.destroy().catch(() => {});
      };
      const pdf = await task.promise;
      if (!closed) {
        setDoc(pdf);
      }
    }
    void load().catch(() => {
      if (!closed) {
        setError("documentUnavailable");
      }
    });
    return () => {
      closed = true;
      dispose();
    };
  }, [source, moduleUrl, workerUrl, attempt]);
  useEffect(() => {
    if (!doc) {
      return;
    }
    const document = doc;
    let closed = false,
      stop = () => {};
    async function render() {
      const pdfPage = await document.getPage(page);
      if (closed || !canvas.current) {
        return;
      }
      const original = pdfPage.getViewport({ scale: 1 }),
        viewport = pdfPage.getViewport({ scale: 1200 / Math.max(original.width, original.height) });
      canvas.current.width = Math.ceil(viewport.width);
      canvas.current.height = Math.ceil(viewport.height);
      const render = pdfPage.render({ canvas: canvas.current, viewport });
      stop = () => render.cancel();
      await render.promise;
      if (!closed) {
        setRendered({ doc: document, page });
      }
    }
    void render().catch(() => {
      if (!closed) {
        setError("pageRenderFailed");
      }
    });
    return () => {
      closed = true;
      stop();
    };
  }, [doc, page]);
  return (
    <div className="space-y-3">
      {doc && (
        <nav
          aria-label={messages.documentPages}
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <Button
            type="button"
            variant="outline"
            disabled={page <= 1}
            onClick={() => {
              setError(undefined);
              setPage(page - 1);
            }}
          >
            {messages.previousPage}
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground">
            {messages.pageTitle} {page} {messages.of} {doc.numPages}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={page >= doc.numPages}
            onClick={() => {
              setError(undefined);
              setPage(page + 1);
            }}
          >
            {messages.nextPage}
          </Button>
        </nav>
      )}
      <div className="relative overflow-hidden rounded-lg border bg-white">
        {error ? (
          <div className="space-y-3 bg-card p-4">
            <p role="alert" className="text-sm text-foreground">
              {error === "documentUnavailable"
                ? messages.previewUnavailable
                : messages.pageRenderFailed}
            </p>
            <Button type="button" variant="outline" onClick={() => setAttempt((n) => n + 1)}>
              {messages.retryPreview}
            </Button>
          </div>
        ) : !ready ? (
          <LoadingSkeleton
            label={doc ? messages.loadingPage : messages.loadingDocument}
            className="aspect-[8.5/11] bg-background p-5 sm:p-8"
          >
            <div className="space-y-4">
              <Skeleton className="h-6 w-3/5" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/6" />
            </div>
          </LoadingSkeleton>
        ) : null}
        <canvas
          aria-label={messages.pageTitle + " " + page}
          ref={canvas}
          className={ready && !error ? "block h-auto w-full" : "sr-only"}
          aria-hidden={!ready || Boolean(error)}
        />
        {ready &&
          !error &&
          fields
            .filter((f) => f.pageIndex === page - 1 && f.rect)
            .map((f) => (
              <button
                type="button"
                key={f.id}
                onClick={() => {
                  const field = document.getElementById("field-" + f.id);
                  (field?.querySelector("input") ?? field)?.focus();
                }}
                aria-label={messages.goToField + " · " + messages[f.type]}
                className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                style={{
                  position: "absolute",
                  ...signFieldPosition(f.rect),
                  border: "2px solid #1d4ed8",
                  background: "rgba(59,130,246,0.14)",
                }}
              />
            ))}
      </div>
    </div>
  );
}
