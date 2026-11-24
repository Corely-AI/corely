import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button, Card, CardContent, Input, Label, Textarea } from "@corely/ui";
import type { SubmitServiceRequest } from "@corely/contracts";
import { issuesApi } from "@/lib/issues-api";
import { issueKeys } from "../queries";

export default function SubmitRequestPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [kind, setKind] = useState<SubmitServiceRequest["kind"]>("PROBLEM");
  const mutation = useMutation({
    mutationFn: (input: SubmitServiceRequest) => issuesApi.submitRequest(input),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: issueKeys.list() });
      navigate("/issues/" + id);
    },
  });

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4 md:p-8">
      <h1 className="text-h1">{t("requests.submit")}</h1>
      <Card>
        <CardContent className="p-5">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const fields = new FormData(event.currentTarget);
              mutation.mutate({
                kind,
                title: String(fields.get("title")).trim(),
                description: String(fields.get("description")).trim(),
                clientEmail: String(fields.get("clientEmail")).trim() || undefined,
                idempotencyKey: idempotencyKey.current,
              });
            }}
          >
            <fieldset className="space-y-3" disabled={mutation.isPending}>
              <legend className="mb-2 text-sm font-medium">{t("requests.whatDoYouNeed")}</legend>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="kind"
                    checked={kind === "PROBLEM"}
                    onChange={() => setKind("PROBLEM")}
                  />
                  {t("requests.problem")}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="kind"
                    checked={kind === "SERVICE"}
                    onChange={() => setKind("SERVICE")}
                  />
                  {t("requests.service")}
                </label>
              </div>
              <div className="space-y-1">
                <Label htmlFor="request-title">{t("requests.title")}</Label>
                <Input id="request-title" name="title" required maxLength={240} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="request-description">{t("issues.fields.description")}</Label>
                <Textarea
                  id="request-description"
                  name="description"
                  required
                  rows={5}
                  maxLength={8000}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="request-client-email">{t("requests.clientEmail")}</Label>
                <Input id="request-client-email" name="clientEmail" type="email" maxLength={320} />
              </div>
            </fieldset>
            {mutation.isError && (
              <p role="alert" className="text-destructive">
                {t("requests.submitFailed")}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={mutation.isPending}>
                {t("requests.submit")}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/issues")}>
                {t("requests.back")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
