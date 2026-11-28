import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Badge, Button, LoadingSkeleton, Textarea } from "@corely/ui";
import { Link } from "react-router-dom";
import type { KnowledgeCopy } from "./knowledge-copy";
import type { ProceduresClient } from "./procedures-client";

export function KnowledgeAssistant({
  client,
  copy,
  locale,
  basePath,
  enabled,
}: {
  client: ProceduresClient;
  copy: KnowledgeCopy;
  locale: string;
  basePath: string;
  enabled: boolean;
}) {
  const [question, setQuestion] = useState("");
  const answer = useMutation({
    mutationFn: (text: string) => client.ask(text),
    gcTime: 0,
    networkMode: "always",
    meta: { persist: false },
  });
  const result = answer.data;
  const status =
    !enabled || answer.isError || result?.status === "unavailable"
      ? copy.assistantUnavailable
      : result?.status === "insufficient"
        ? copy.insufficient
        : result?.status === "source-changed"
          ? copy.changed
          : undefined;

  return (
    <>
      <Link to={basePath} className="text-sm text-primary underline">
        {copy.browse}
      </Link>
      <h1 className="text-2xl font-semibold">{copy.ask}</h1>
      {enabled && (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (question.trim().length >= 3 && !answer.isPending) {
              answer.mutate(question.trim());
            }
          }}
        >
          <label htmlFor="knowledge-question" className="text-sm font-medium">
            {copy.question}
          </label>
          <Textarea
            id="knowledge-question"
            value={question}
            maxLength={400}
            disabled={answer.isPending}
            onChange={(event) => {
              setQuestion(event.target.value);
              answer.reset();
            }}
          />
          <Button type="submit" disabled={question.trim().length < 3 || answer.isPending}>
            {copy.check}
          </Button>
        </form>
      )}
      {status && (
        <p className="rounded-xl border border-border bg-card p-5" role="status">
          {status}
        </p>
      )}
      {answer.isPending && <LoadingSkeleton label={copy.checking} variant="list" />}
      {enabled && result?.status === "answered" && (
        <section aria-labelledby="knowledge-evidence" className="space-y-3">
          <h2 id="knowledge-evidence" className="text-lg font-semibold">
            {copy.evidence}
          </h2>
          <p className="text-sm text-muted-foreground">
            {copy.checked}{" "}
            <time dateTime={result.checkedAt}>
              {new Date(result.checkedAt).toLocaleString(locale)}
            </time>
          </p>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {result.citations.map((source) => (
              <li key={JSON.stringify([source.id, source.quote])} className="space-y-2 p-4">
                <blockquote className="whitespace-pre-wrap break-words border-l-2 border-border pl-3 text-sm">
                  {source.quote}
                </blockquote>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Link
                    to={`${basePath}/published/${source.id}`}
                    className="break-words text-primary underline"
                  >
                    {source.title}
                  </Link>
                  <span className="text-muted-foreground">
                    {copy.version} {source.version}
                  </span>
                  {source.reviewOverdue && <Badge variant="outline">{copy.overdue}</Badge>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
