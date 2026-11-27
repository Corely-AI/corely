"use client";
import { useEffect, useRef, useState } from "react";
import type { SignRecipientMessages } from "@corely/web-shared/shared/i18n/sign-recipient";
import type * as PDFJS from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { signFieldPosition, type SignField } from "@corely/contracts";

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
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let closed = false,
      dispose = () => {};
    async function load() {
      const { getDocument, GlobalWorkerOptions } = (await import(
        /* @vite-ignore */ /* webpackIgnore: true */ moduleUrl
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
        void task.destroy();
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
  }, [source, moduleUrl, workerUrl]);
  useEffect(() => {
    if (!doc) {
      return;
    }
    let closed = false,
      stop = () => {};
    async function render() {
      const pdfPage = await doc!.getPage(page);
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
    <section aria-label="Document preview" className="space-y-2">
      {error && <p role="alert">{messages[error]}</p>}
      <div className="relative">
        <canvas
          aria-label={"Document page " + page}
          ref={canvas}
          className="block h-auto w-full border bg-white"
        />
        {doc &&
          fields
            .filter((f) => f.pageIndex === page - 1 && f.rect)
            .map((f) => (
              <button
                type="button"
                key={f.id}
                onClick={() => document.getElementById("field-" + f.id)?.focus()}
                aria-label={"Go to " + f.type + " field"}
                style={{
                  position: "absolute",
                  ...signFieldPosition(f.rect),
                  border: "2px solid #1d4ed8",
                  background: "rgba(59,130,246,0.14)",
                }}
              />
            ))}
      </div>
      {doc && (
        <nav aria-label="Document pages" className="flex justify-between">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {messages.previousPage}
          </button>
          <span>
            {messages.pageTitle} {page} {messages.of} {doc.numPages}
          </span>
          <button disabled={page >= doc.numPages} onClick={() => setPage(page + 1)}>
            {messages.nextPage}
          </button>
        </nav>
      )}
    </section>
  );
}
