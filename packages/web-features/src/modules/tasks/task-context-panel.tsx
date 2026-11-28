import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Input, LoadingSkeleton } from "@corely/ui";
import {
  MAX_TASK_ATTACHMENT_BYTES,
  type TaskAttachment,
  type TaskContext,
  type TaskSource,
} from "@corely/contracts";
import type { TaskContextClient } from "./tasks-client";

const sourceRoutes = {
  booking: "/booking/bookings/",
  request: "/requests/",
  procedure: "/knowledge/",
} as const;

const text = {
  en: {
    context: "Task context",
    comment: "Comment",
    comments: "Comments",
    post: "Post comment",
    file: "File",
    files: "Files",
    attach: "Attach file",
    link: "Link source",
    links: "Linked records",
    source: "Booking link",
    unavailable: "Source unavailable",
    empty: "No task context yet.",
    error: "Task context could not be loaded or saved.",
    retry: "Retry",
    loading: "Loading task context",
    invalidLink: "Enter a booking URL from this workspace.",
    invalidFile: "Use a PDF, PNG or JPEG up to 1 MB.",
    booking: "Booking",
    request: "Request",
    procedure: "Procedure",
  },
  de: {
    context: "Aufgabenkontext",
    comment: "Kommentar",
    comments: "Kommentare",
    post: "Kommentar hinzufügen",
    file: "Datei",
    files: "Dateien",
    attach: "Datei anhängen",
    link: "Quelle verknüpfen",
    links: "Verknüpfte Einträge",
    source: "Buchungslink",
    unavailable: "Quelle nicht verfügbar",
    empty: "Für diese Aufgabe gibt es noch keinen Kontext.",
    error: "Der Aufgabenkontext konnte nicht geladen oder gespeichert werden.",
    retry: "Erneut versuchen",
    loading: "Aufgabenkontext wird geladen",
    invalidLink: "Gib eine Buchungs-URL aus diesem Arbeitsbereich ein.",
    invalidFile: "Verwende PDF, PNG oder JPEG bis 1 MB.",
    booking: "Buchung",
    request: "Anfrage",
    procedure: "Anleitung",
  },
  vi: {
    context: "Bối cảnh công việc",
    comment: "Bình luận",
    comments: "Các bình luận",
    post: "Đăng bình luận",
    file: "Tệp",
    files: "Các tệp",
    attach: "Đính kèm tệp",
    link: "Liên kết nguồn",
    links: "Hồ sơ liên kết",
    source: "Đường dẫn lịch hẹn",
    unavailable: "Nguồn không khả dụng",
    empty: "Công việc chưa có bối cảnh.",
    error: "Không thể tải hoặc lưu bối cảnh công việc.",
    retry: "Thử lại",
    loading: "Đang tải bối cảnh",
    invalidLink: "Hãy nhập đường dẫn lịch hẹn trong không gian làm việc này.",
    invalidFile: "Sử dụng PDF, PNG hoặc JPEG tối đa 1 MB.",
    booking: "Lịch hẹn",
    request: "Yêu cầu",
    procedure: "Quy trình",
  },
} as const;

function parseBookingUrl(raw: string): TaskSource | null {
  try {
    const url = new URL(raw, window.location.origin);
    const match = /^\/booking\/bookings\/([a-zA-Z0-9_-]{1,160})\/?$/.exec(url.pathname);
    return url.origin === window.location.origin && match
      ? { kind: "booking", id: match[1] }
      : null;
  } catch {
    return null;
  }
}

const asBase64 = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const parts: string[] = [];
  for (let index = 0; index < bytes.length; index += 8192) {
    parts.push(String.fromCharCode(...bytes.subarray(index, index + 8192)));
  }
  return btoa(parts.join(""));
};

export function TaskContextPanel({
  client,
  taskId,
  workspaceId,
  locale,
  canWrite,
}: {
  client: TaskContextClient;
  taskId: string;
  workspaceId: string;
  locale: string;
  canWrite: boolean;
}) {
  const translations = locale === "de" ? text.de : locale === "vi" ? text.vi : text.en;
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<TaskContext>();
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<"error" | "invalidLink" | "invalidFile">();
  const [comment, setComment] = useState("");
  const [bookingLink, setBookingLink] = useState("");
  const [file, setFile] = useState<File>();
  const fileInput = useRef<HTMLInputElement>(null);
  const keys = useRef(new Map<string, string>());
  const inFlight = useRef(false);
  const disclosureVersion = useRef(0);
  const [preview, setPreview] = useState<{ url: string; name: string }>();

  useEffect(() => {
    if (!open) {return;}
    const controller = new AbortController();
    setData(undefined);
    setMessage(undefined);
    setLoading(true);
    void client
      .get(taskId, controller.signal)
      .then(
        (next) => {
          if (!controller.signal.aborted) {setData(next);}
        },
        () => {
          if (!controller.signal.aborted) {setMessage("error");}
        }
      )
      .finally(() => {
        if (!controller.signal.aborted) {setLoading(false);}
      });
    return () => controller.abort();
  }, [client, open, retry, taskId]);

  useEffect(() => {
    return () => {
      if (preview) {URL.revokeObjectURL(preview.url);}
    };
  }, [preview]);

  async function save(
    signature: string,
    action: (key: string) => Promise<TaskContext>,
    clear: () => void
  ) {
    if (inFlight.current) {return;}
    inFlight.current = true;
    const version = disclosureVersion.current;
    const key = keys.current.get(signature) ?? crypto.randomUUID();
    keys.current.set(signature, key);
    setBusy(true);
    setMessage(undefined);
    try {
      const next = await action(key);
      keys.current.delete(signature);
      if (version === disclosureVersion.current) {
        setData(next);
        clear();
      } else {
        setRetry((attempt) => attempt + 1);
      }
    } catch {
      if (version === disclosureVersion.current) {setMessage("error");}
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function download(attachment: TaskAttachment) {
    const version = disclosureVersion.current;
    try {
      const blob = await client.download(taskId, attachment.documentId);
      if (version !== disclosureVersion.current) {return;}
      if (attachment.contentType === "image/jpeg" || attachment.contentType === "image/png") {
        setPreview({
          url: URL.createObjectURL(new Blob([blob], { type: attachment.contentType })),
          name: attachment.filename,
        });
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (version === disclosureVersion.current) {
        setPreview(undefined);
        setMessage("error");
      }
    }
  }

  function submitLink(event: FormEvent) {
    event.preventDefault();
    const source = parseBookingUrl(bookingLink);
    if (!source) {
      setMessage("invalidLink");
      return;
    }
    void save(
      "source:" + source.id,
      (key) => client.addSource(taskId, source, key),
      () => setBookingLink("")
    );
  }

  async function submitFile(event: FormEvent) {
    event.preventDefault();
    const contentType = file?.type;
    if (
      !file ||
      file.size > MAX_TASK_ATTACHMENT_BYTES ||
      (contentType !== "application/pdf" &&
        contentType !== "image/png" &&
        contentType !== "image/jpeg")
    ) {
      setMessage("invalidFile");
      return;
    }
    try {
      const base64 = await asBase64(file);
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(base64));
      const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0")
      ).join("");
      void save(
        "file:" + file.name + ":" + fingerprint,
        (key) => client.upload(taskId, { base64, contentType, filename: file.name }, key),
        () => {
          setFile(undefined);
          if (fileInput.current) {fileInput.current.value = "";}
        }
      );
    } catch {
      setMessage("error");
    }
  }

  return (
    <details
      className="task-context"
      onToggle={(event) => {
        const expanded = event.currentTarget.open;
        setOpen(expanded);
        if (!expanded) {
          disclosureVersion.current += 1;
          setData(undefined);
          setPreview(undefined);
        }
      }}
    >
      <summary>{translations.context}</summary>
      {open && (
        <div className="task-context-body">
          {loading && <LoadingSkeleton label={translations.loading} variant="list" />}
          {message && (
            <p role="alert" className="task-error">
              {translations[message]}
            </p>
          )}
          {!data && message === "error" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setRetry((attempt) => attempt + 1)}
            >
              {translations.retry}
            </Button>
          )}
          {data && (
            <>
              {!data.comments.length && !data.sources.length && !data.files.length && (
                <p>{translations.empty}</p>
              )}
              {data.comments.length > 0 && (
                <section>
                  <h3>{translations.comments}</h3>
                  <ul>
                    {data.comments.map((note) => (
                      <li key={note.id}>
                        <p>{note.text}</p>
                        <time dateTime={note.createdAt}>
                          {new Date(note.createdAt).toLocaleString(locale)}
                        </time>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {data.files.length > 0 && (
                <section>
                  <h3>{translations.files}</h3>
                  <ul>
                    {data.files.map((attachment) => (
                      <li key={attachment.documentId}>
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => void download(attachment)}
                        >
                          {attachment.filename}
                        </Button>
                      </li>
                    ))}
                  </ul>
                  {preview && (
                    <img className="task-context-preview" src={preview.url} alt={preview.name} />
                  )}
                </section>
              )}
              {data.sources.length > 0 && (
                <section>
                  <h3>{translations.links}</h3>
                  <ul>
                    {data.sources.map((source, index) => (
                      <li key={source.kind + ":" + index}>
                        {source.status === "available" ? (
                          <a
                            href={
                              sourceRoutes[source.kind] +
                              encodeURIComponent(source.id) +
                              "?workspaceId=" +
                              encodeURIComponent(workspaceId)
                            }
                          >
                            {translations[source.kind]}
                          </a>
                        ) : (
                          <span>
                            {translations[source.kind]} · {translations.unavailable}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {canWrite && (
                <>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (comment.trim())
                        {void save(
                          "comment:" + comment.trim(),
                          (key) => client.comment(taskId, comment.trim(), key),
                          () => setComment("")
                        );}
                    }}
                  >
                    <label>
                      {translations.comment}
                      <textarea
                        maxLength={2000}
                        disabled={busy}
                        required
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                      />
                    </label>
                    <Button type="submit" variant="outline" disabled={busy || !comment.trim()}>
                      {translations.post}
                    </Button>
                  </form>
                  <form onSubmit={(event) => void submitFile(event)}>
                    <label>
                      {translations.file}
                      <Input
                        ref={fileInput}
                        type="file"
                        disabled={busy}
                        accept="application/pdf,image/png,image/jpeg"
                        onChange={(event) => setFile(event.target.files?.[0])}
                      />
                    </label>
                    <Button type="submit" variant="outline" disabled={busy || !file}>
                      {translations.attach}
                    </Button>
                  </form>
                  <form onSubmit={submitLink}>
                    <label>
                      {translations.source}
                      <Input
                        value={bookingLink}
                        disabled={busy}
                        onChange={(event) => setBookingLink(event.target.value)}
                        required
                      />
                    </label>
                    <Button type="submit" variant="outline" disabled={busy || !bookingLink.trim()}>
                      {translations.link}
                    </Button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      )}
    </details>
  );
}
