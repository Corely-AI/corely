import {
  OperationalRequestDraftSchema,
  LinkOperationalRequestProcedureSchema,
  OperationalRequestKindSchema,
  OperationalRequestRoutingMissingCode,
  SubmitOperationalRequestDraftSchema,
  type OperationalRequest,
  type OperationalRequestKind,
} from "@corely/contracts";
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
} from "@corely/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWorkspaceConfig } from "@corely/web-shared/shared/workspaces/workspace-config-provider";
import type { OperationalRequestsClient } from "./operational-requests-api";
import { emptyDraft, kindLabel, RequestDraftFields } from "./request-draft-fields";
import { formatDate, statusLabel, statusOf, type RequestsCopy } from "./requests-copy";

export function RequestForm({
  requestsApi,
  scope,
  record,
  copy,
  locale,
  canSubmit,
  onReload,
}: {
  requestsApi: OperationalRequestsClient;
  scope: readonly unknown[];
  record: OperationalRequest | undefined;
  copy: RequestsCopy;
  locale: string;
  canSubmit: boolean;
  onReload: () => Promise<OperationalRequest | undefined>;
}) {
  const [saved, setSaved] = useState(record);
  const [draft, setDraft] = useState(() => record?.draft ?? emptyDraft("ABSENCE"));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [stale, setStale] = useState(false);
  const [procedureLink, setProcedureLink] = useState("");
  const keys = useRef(new Map<string, string>());
  const mounted = useRef(false);
  const inFlight = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const client = useQueryClient();
  const { hasCapability } = useWorkspaceConfig();
  const navigate = useNavigate();
  const editable = canSubmit && (!saved || saved.status === "DRAFT");
  const dirty = !saved || JSON.stringify(saved.draft) !== JSON.stringify(draft);
  const policyDocumentId = saved?.canReadPolicy ? saved.draft.policyDocumentId : null;
  const linkedProcedure =
    record && record.version >= (saved?.version ?? 0) ? record.procedure : saved?.procedure;

  function changeProcedure(request: OperationalRequest, remove = false) {
    const reference = remove ? null : publishedProcedureId(procedureLink);
    if (!remove && !reference) {
      setError(copy.invalidProcedure);
      return;
    }
    return run(async () => {
      const next = await withKey(
        JSON.stringify(["procedure", request.id, request.version, reference]),
        (key) => requestsApi.linkProcedure(request.id, request.version, reference, key)
      );
      accept(next);
      if (mounted.current) {
        setProcedureLink("");
        setNotice(copy.saved);
      }
    }, copy.unavailableProcedure);
  }

  async function withKey<T>(signature: string, work: (key: string) => Promise<T>) {
    const key = keys.current.get(signature) ?? crypto.randomUUID();
    keys.current.set(signature, key);
    const result = await work(key);
    keys.current.delete(signature);
    return result;
  }

  function accept(next: OperationalRequest) {
    if (!mounted.current) {
      return;
    }
    setSaved(next);
    setStale(false);
    void client.invalidateQueries({ queryKey: ["operational-requests", ...scope, "list"] });
  }

  async function run(work: () => Promise<void>, fallback = copy.saveError) {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (failure) {
      if (!mounted.current) {
        return;
      }
      if (isRoutingError(failure)) {
        setError(copy.routingMissing);
      } else if (statusOf(failure) === 409) {
        setStale(true);
        setError(copy.stale);
      } else {
        setError(fallback);
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) {
        setPending(false);
      }
    }
  }

  async function saveDraft(submit: boolean) {
    const input = (
      submit ? SubmitOperationalRequestDraftSchema : OperationalRequestDraftSchema
    ).safeParse(draft);
    if (!input.success) {
      setNotice("");
      setError(copy.invalid);
      return;
    }
    await run(async () => {
      const next = await withKey(
        JSON.stringify(["save", saved?.id, saved?.version, input.data]),
        (key) =>
          saved
            ? requestsApi.save(saved.id, saved.version, input.data, key)
            : requestsApi.create(input.data, key)
      );
      accept(next);
      if (mounted.current) {
        setDraft(next.draft);
        if (!saved) {
          navigate(`/requests/${next.id}`, { replace: true });
          return;
        }
      }
      if (submit && mounted.current) {
        await submitSaved(next);
      } else if (mounted.current) {
        setNotice(copy.saved);
      }
    });
  }

  async function submitSaved(next: OperationalRequest) {
    accept(
      await withKey(`submit:${next.id}:${next.version}`, (key) =>
        requestsApi.transition(next.id, "submit", next.version, key)
      )
    );
  }

  async function submit() {
    if (!SubmitOperationalRequestDraftSchema.safeParse(draft).success) {
      setNotice("");
      setError(copy.invalid);
      return;
    }
    if (saved && !dirty) {
      await run(() => submitSaved(saved));
    } else {
      await saveDraft(true);
    }
  }

  function attach(file: File, request: OperationalRequest) {
    if (
      !["application/pdf", "image/png", "image/jpeg"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setError(copy.fileHint);
      return;
    }
    return run(async () => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 32768) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
      }
      const base64 = btoa(binary);
      accept(
        await withKey(
          JSON.stringify(["attach", request.id, request.version, file.name, base64]),
          (key) => requestsApi.attach(request.id, request.version, file, base64, key)
        )
      );
    });
  }

  function openFile(access: () => Promise<string>) {
    return run(async () => {
      const url = await access();
      if (!mounted.current) {
        return;
      }
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    }, copy.downloadError);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-6 p-4 sm:p-6">
          {saved ? (
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={saved.status === "SUBMITTED" ? "default" : "secondary"}>
                {statusLabel(saved.status, copy)}
              </Badge>
              {saved.submittedAt && (
                <span className="text-sm text-muted-foreground">
                  {copy.submittedOn} {formatDate(saved.submittedAt, locale)}
                </span>
              )}
              {saved.withdrawnAt && (
                <span className="text-sm text-muted-foreground">
                  {copy.withdrawnOn} {formatDate(saved.withdrawnAt, locale)}
                </span>
              )}
            </div>
          ) : (
            <div className="max-w-xs space-y-2">
              <Label htmlFor="request-template">{copy.kind}</Label>
              <select
                id="request-template"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-ring"
                value={draft.kind}
                disabled={pending}
                onChange={(event) =>
                  setDraft(emptyDraft(event.target.value as OperationalRequestKind))
                }
              >
                {OperationalRequestKindSchema.options.map((kind) => (
                  <option key={kind} value={kind}>
                    {kindLabel(kind, copy)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <RequestDraftFields
            draft={draft}
            change={setDraft}
            editable={editable && !pending}
            copy={copy}
          />
          {policyDocumentId && (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => void openFile(() => requestsApi.policyLink(policyDocumentId))}
            >
              {copy.openPolicy}
            </Button>
          )}
        </CardContent>
      </Card>
      {saved && (linkedProcedure || (editable && hasCapability("knowledge.procedures"))) && (
        <Card>
          <CardContent className="space-y-3 p-4 sm:p-6">
            <h2 className="text-lg font-semibold">{copy.procedure}</h2>
            {linkedProcedure?.state === "available" && (
              <Link
                className="text-sm text-primary underline"
                to={`/knowledge/published/${encodeURIComponent(linkedProcedure.id)}`}
              >
                {copy.openProcedure}
              </Link>
            )}
            {linkedProcedure?.state === "unavailable" && (
              <p role="status">{copy.unavailableProcedure}</p>
            )}
            {editable && hasCapability("knowledge.procedures") && (
              <div className="space-y-2">
                <Label htmlFor="request-procedure-link">{copy.procedureLink}</Label>
                <Input
                  id="request-procedure-link"
                  value={procedureLink}
                  onChange={(event) => setProcedureLink(event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending || stale || !procedureLink.trim()}
                    onClick={() => void changeProcedure(saved)}
                  >
                    {copy.linkProcedure}
                  </Button>
                  {linkedProcedure && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={pending || stale}
                      onClick={() => void changeProcedure(saved, true)}
                    >
                      {copy.removeProcedure}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">{copy.attachments}</h2>
          {saved && saved.attachments.length > 0 && (
            <ul className="space-y-1">
              {saved.attachments.map((file) => (
                <li key={file.id}>
                  <Button
                    variant="link"
                    className="h-auto max-w-full whitespace-normal break-all px-0 py-2 text-left"
                    disabled={pending}
                    onClick={() => void openFile(() => requestsApi.fileLink(saved.id, file.id))}
                  >
                    {file.name}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {saved && editable && saved.attachments.length < 5 ? (
            <div className="max-w-sm space-y-2">
              <Label htmlFor="request-file">{copy.upload}</Label>
              <Input
                id="request-file"
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                disabled={pending || stale}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) {
                    void attach(file, saved);
                  }
                }}
              />
              <p className="text-sm text-muted-foreground">{copy.fileHint}</p>
            </div>
          ) : (
            !saved && <p className="text-sm text-muted-foreground">{copy.saveForFile}</p>
          )}
        </CardContent>
      </Card>
      {error && (
        <Alert className="border-destructive/70 text-foreground" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <p role="status" className="text-sm font-medium">
          {notice}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {stale && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              void run(async () => {
                const latest = await onReload();
                if (!latest) {
                  throw new Error("Unable to reload request");
                }
                if (mounted.current) {
                  accept(latest);
                  setDraft(latest.draft);
                }
              })
            }
          >
            {copy.retry}
          </Button>
        )}
        {editable && (
          <Button disabled={pending || stale || !dirty} onClick={() => void saveDraft(false)}>
            {copy.save}
          </Button>
        )}
        {editable && saved && (
          <Button
            variant={dirty ? "outline" : "default"}
            disabled={pending || stale}
            onClick={() => void submit()}
          >
            {copy.send}
          </Button>
        )}
        {saved && canSubmit && saved.status !== "WITHDRAWN" && (
          <Button
            variant="outline"
            disabled={pending || stale}
            onClick={() => setConfirmWithdraw(true)}
          >
            {copy.withdraw}
          </Button>
        )}
      </div>
      <AlertDialog open={confirmWithdraw} onOpenChange={setConfirmWithdraw}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.confirm}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (saved) {
                  void run(async () => {
                    const withdrawn = await withKey(
                      `withdraw:${saved.id}:${saved.version}`,
                      (key) => requestsApi.transition(saved.id, "withdraw", saved.version, key)
                    );
                    accept(withdrawn);
                    if (mounted.current) {
                      setDraft(withdrawn.draft);
                    }
                  });
                }
              }}
            >
              {copy.withdraw}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function publishedProcedureId(raw: string) {
  try {
    const url = new URL(raw.trim(), window.location.origin);
    const prefix = "/knowledge/published/";
    if (url.origin !== window.location.origin || !url.pathname.startsWith(prefix)) {
      return null;
    }
    const parsed = LinkOperationalRequestProcedureSchema.shape.procedureId.safeParse(
      url.pathname.slice(prefix.length).replace(/\/$/, "")
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function isRoutingError(error: unknown) {
  if (typeof error !== "object" || error === null || !("body" in error)) {
    return false;
  }
  const { body } = error;
  return (
    typeof body === "object" &&
    body !== null &&
    "code" in body &&
    body.code === OperationalRequestRoutingMissingCode
  );
}
