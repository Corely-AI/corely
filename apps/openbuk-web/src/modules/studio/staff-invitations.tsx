import { useState, type FormEvent } from "react";
import type { CreateWorkspaceInviteOutput } from "@corely/contracts";
import { api, json } from "../../shared/api";
import { Field, ErrorMessage } from "../../shared/ui";
import { useLanguage } from "../../shared/i18n";

export function StaffInvitations({ workspaceId }: { workspaceId: string }) {
  const { t, locale } = useLanguage();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [invite, setInvite] = useState<CreateWorkspaceInviteOutput["invite"] | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email"));
    setPending(true);
    setError(false);
    setInvite(null);
    try {
      const result = await api.request<CreateWorkspaceInviteOutput>(
        `/workspaces/${encodeURIComponent(workspaceId)}/pilot-setup/invites`,
        json("POST", { email })
      );
      setInvite(result.invite);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="staff-invitations">
      <h2>{t("inviteStaff")}</h2>
      <p className="muted">{t("inviteHelp")}</p>
      <form onSubmit={(event) => void submit(event)}>
        <Field label={t("staffEmail")}>
          <input name="email" type="email" required onChange={() => setInvite(null)} />
        </Field>
        <button className="button secondary" disabled={pending}>
          {t(pending ? "saving" : "createInvite")}
        </button>
      </form>
      {error ? <ErrorMessage /> : null}
      {invite ? (
        <div role="status">
          <p>
            {t("inviteReady")} {new Date(invite.expiresAt).toLocaleDateString(locale)}
          </p>
          <Field label={t("inviteLink")}>
            <input
              readOnly
              value={`${window.location.origin}/invite#${invite.token}`}
              onFocus={(event) => event.target.select()}
            />
          </Field>
        </div>
      ) : null}
    </section>
  );
}
