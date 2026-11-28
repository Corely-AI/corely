import { useState, type FormEvent } from "react";
import {
  ProcedureFileMaxBytes,
  type ProcedureFields,
  type UpdateProcedure,
} from "@corely/contracts";
import { Button, Input, Label, Textarea } from "@corely/ui";
import { Link } from "react-router-dom";
import type { KnowledgeCopy } from "./knowledge-copy";

type FormContent = UpdateProcedure["content"];
type ProcedureFormValues = Pick<UpdateProcedure, "title" | "reviewDate" | "content">;

async function fileBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  }
  return btoa(binary);
}

export function ProcedureForm({
  initial,
  copy,
  cancelPath,
  pending,
  onSave,
}: {
  initial?: ProcedureFields;
  copy: KnowledgeCopy;
  cancelPath: string;
  pending: boolean;
  onSave: (values: ProcedureFormValues) => Promise<void>;
}) {
  const [kind, setKind] = useState<FormContent["kind"]>(initial?.content.kind ?? "page");
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState(false);
  const existing = initial?.content.kind === "file" ? initial.content.filename : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const value = (key: string) => String(fields.get(key) ?? "");
    setFileError(false);

    let content: FormContent;
    if (kind === "file") {
      if ((!file && !existing) || (file && (!file.size || file.size > ProcedureFileMaxBytes))) {
        setFileError(true);
        return;
      }
      setReading(true);
      try {
        content = {
          kind,
          ...(file ? { upload: { filename: file.name, base64: await fileBase64(file) } } : {}),
        };
      } catch {
        setFileError(true);
        return;
      } finally {
        setReading(false);
      }
    } else {
      content =
        kind === "page"
          ? { kind, text: value("procedure-text") }
          : { kind, url: value("procedure-url") };
    }
    await onSave({
      title: value("procedure-title"),
      reviewDate: value("procedure-review"),
      content,
    });
  }

  return (
    <form
      className="space-y-5 rounded-xl border border-border bg-card p-5"
      onSubmit={(event) => void submit(event)}
    >
      <div className="space-y-2">
        <Label htmlFor="procedure-title">{copy.title}</Label>
        <Input
          id="procedure-title"
          name="procedure-title"
          defaultValue={initial?.title}
          maxLength={160}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="procedure-review">{copy.review}</Label>
        <Input
          id="procedure-review"
          name="procedure-review"
          type="date"
          defaultValue={initial?.reviewDate}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="procedure-kind">{copy.kind}</Label>
        <select
          id="procedure-kind"
          className="h-10 w-full rounded-md border border-input bg-background px-3"
          value={kind}
          onChange={(event) => {
            const next = event.target.value;
            if (next === "page" || next === "link" || next === "file") {
              setKind(next);
            }
          }}
        >
          <option value="page">{copy.page}</option>
          <option value="link">{copy.link}</option>
          <option value="file">{copy.file}</option>
        </select>
      </div>
      {kind === "page" && (
        <div className="space-y-2">
          <Label htmlFor="procedure-text">{copy.content}</Label>
          <Textarea
            id="procedure-text"
            name="procedure-text"
            defaultValue={initial?.content.kind === "page" ? initial.content.text : undefined}
            required
            rows={8}
            maxLength={20000}
          />
        </div>
      )}
      {kind === "link" && (
        <div className="space-y-2">
          <Label htmlFor="procedure-url">{copy.url}</Label>
          <Input
            id="procedure-url"
            name="procedure-url"
            type="url"
            pattern="https?://.*"
            defaultValue={initial?.content.kind === "link" ? initial.content.url : undefined}
            maxLength={2000}
            required
          />
        </div>
      )}
      {kind === "file" && (
        <div className="space-y-2">
          <Label htmlFor="procedure-file">{copy.upload}</Label>
          <Input
            id="procedure-file"
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          {existing && (
            <p className="break-all text-sm text-muted-foreground">
              {copy.selected} · {existing}
            </p>
          )}
          {fileError && (
            <p role="alert" className="text-sm text-destructive">
              {copy.missingFile}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || reading}>
          {pending || reading ? copy.saving : copy.save}
        </Button>
        <Button asChild type="button" variant="outline">
          <Link to={cancelPath}>{copy.cancel}</Link>
        </Button>
      </div>
    </form>
  );
}
