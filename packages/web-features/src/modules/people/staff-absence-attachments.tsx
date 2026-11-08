import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { Button, Input, Label } from "@corely/ui";
import type { StaffAbsence, PersonnelAttachment } from "@corely/contracts";
import { peopleApi } from "./people-api";
import { usePeopleAccess, usePeopleLoad, usePeopleMounted } from "./use-people";
import type { AbsenceCopy } from "./absence-copy";
export function StaffAbsenceAttachments({
  staffId,
  record,
  manage,
  copy: t,
}: {
  staffId: string;
  record: StaffAbsence;
  manage: boolean;
  copy: AbsenceCopy;
}) {
  const access = usePeopleAccess();
  const version = record.revisions[record.revisions.length - 1].version;
  const identity = `${access.scope}:${staffId}:${record.id}:${version}:${manage}`;
  const result = usePeopleLoad(
    (signal) => peopleApi.absenceAttachments(staffId, record.id, signal),
    identity
  );
  const mounted = usePeopleMounted(identity);
  const [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    setBusy(false);
    setFailed(false);
  }, [identity]);
  const controller = useRef<AbortController>();
  const operation = useRef<{ fingerprint: string; key: string }>();
  useEffect(() => {
    const active = new AbortController();
    controller.current = active;
    return () => active.abort();
  }, [identity]);
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      if (
        file.size > 1024 * 1024 ||
        !["application/pdf", "image/png", "image/jpeg", "text/plain"].includes(file.type)
      ) {
        throw new Error("Invalid attachment");
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("File read failed"));
        reader.readAsDataURL(file);
      });
      if (!mounted.current) {
        return;
      }
      const body = { version, filename: file.name, contentType: file.type, base64 };
      const fingerprint = JSON.stringify(body);
      if (operation.current?.fingerprint !== fingerprint) {
        operation.current = { fingerprint, key: crypto.randomUUID() };
      }
      await peopleApi.uploadAbsenceAttachment(staffId, record.id, body, operation.current.key);
      if (mounted.current) {
        operation.current = undefined;
        result.reload();
      }
    } catch {
      if (mounted.current) {
        setFailed(true);
      }
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }
  }
  async function download(attachment: PersonnelAttachment) {
    setBusy(true);
    setFailed(false);
    try {
      const active = controller.current;
      if (!active) {
        return;
      }
      const blob = await peopleApi.downloadAbsenceAttachment(
        staffId,
        record.id,
        attachment.documentId,
        active.signal
      );
      if (!mounted.current) {
        return;
      }
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = attachment.filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      if (mounted.current) {
        setFailed(true);
      }
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }
  }
  return (
    <section className="space-y-3 border-t pt-4" aria-label={t.attachments}>
      <h4 className="text-sm font-medium">{t.attachments}</h4>
      <p className="text-xs text-muted-foreground">{t.fileHint}</p>
      {result.loading ? (
        <p role="status">{access.copy.loading}</p>
      ) : result.error ? (
        <div role="alert">
          {t.fileError}
          <Button variant="outline" onClick={result.reload}>
            {access.copy.retry}
          </Button>
        </div>
      ) : (
        <>
          {!result.data?.items.length && <p className="text-sm">{t.noFiles}</p>}
          {result.data?.items.map((attachment) => (
            <div key={attachment.documentId} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="min-w-0 break-all">
                {attachment.filename} · {Math.ceil(attachment.sizeBytes / 1024)} KiB
              </span>
              <Button variant="outline" disabled={busy} onClick={() => void download(attachment)}>
                {t.download}
              </Button>
            </div>
          ))}
          {manage && (
            <div>
              <Label htmlFor={`absence-file-${record.id}`}>{t.upload}</Label>
              <Input
                id={`absence-file-${record.id}`}
                type="file"
                accept="application/pdf,image/png,image/jpeg,text/plain"
                disabled={busy}
                onChange={(event) => void upload(event)}
              />
            </div>
          )}
        </>
      )}
      {failed && (
        <p role="alert" className="text-sm">
          {t.fileError}
        </p>
      )}
    </section>
  );
}
