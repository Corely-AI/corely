import { useRef, useState, type FormEvent } from "react";
import {
  OpenBukSetupSchema,
  type OpenBukStudio,
  type OpenBukSetup,
  type WorkspaceDto,
  type CreateWorkspaceOutput,
} from "@corely/contracts";
import { api, json, storage } from "../../shared/api";
import { Field, ErrorMessage } from "../../shared/ui";
import { useLanguage, languageNames } from "../../shared/i18n";
export function SetupForm({
  workspace,
  studio,
  onSaved,
  onWorkspace,
}: {
  workspace: WorkspaceDto | null;
  studio: OpenBukStudio | null;
  onSaved: (studio: OpenBukStudio) => void;
  onWorkspace: (workspace: WorkspaceDto) => void;
}) {
  const { t, locale } = useLanguage();
  const key = useRef(crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [hours, setHours] = useState<OpenBukSetup["weeklyHours"]>(
    studio?.weeklyHours ??
      [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startTime: "09:00", endTime: "18:00" }))
  );
  const [blocks, setBlocks] = useState<OpenBukSetup["blockedTimes"]>(studio?.blockedTimes ?? []);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(false);
    const data = new FormData(event.currentTarget);
    const string = (name: string) => String(data.get(name) ?? "");
    const number = (name: string) => Number(data.get(name));
    try {
      const input = OpenBukSetupSchema.parse({
        studioName: string("studioName"),
        timezone: string("timezone"),
        locale: string("locale"),
        currency: string("currency"),
        serviceName: string("serviceName"),
        staffName: string("staffName"),
        durationMinutes: number("durationMinutes"),
        priceCents: (() => {
          const [whole, fraction = ""] = string("price").replace(",", ".").split(".");
          return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
        })(),
        bufferBeforeMinutes: number("bufferBeforeMinutes"),
        bufferAfterMinutes: number("bufferAfterMinutes"),
        minimumNoticeMinutes: number("minimumNoticeMinutes"),
        maximumAdvanceDays: number("maximumAdvanceDays"),
        weeklyHours: hours,
        blockedTimes: blocks,
      });
      let active = workspace;
      if (!active) {
        const result = await api.request<CreateWorkspaceOutput>(
          "/workspaces",
          json("POST", {
            name: input.studioName,
            kind: "COMPANY",
            countryCode: string("country"),
            currency: input.currency,
            publicEnabled: false,
          }),
          { idempotencyKey: key.current }
        );
        active = result.workspace;
        onWorkspace(active);
      }
      await storage.setActiveWorkspaceId(active.id);
      const result = await api.request<{ studio: OpenBukStudio }>(
        "/openbuk/studio",
        json("PUT", input)
      );
      await api.request(
        `/workspaces/${encodeURIComponent(active.id)}`,
        json("PATCH", {
          publicEnabled: true,
          publicModules: { ...active.publicModules, booking: true },
        }),
        { idempotencyKey: `${key.current}-publish` }
      );
      onSaved(result.studio);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  const numeric = (
    key:
      | "durationMinutes"
      | "priceCents"
      | "bufferBeforeMinutes"
      | "bufferAfterMinutes"
      | "minimumNoticeMinutes"
      | "maximumAdvanceDays",
    label: string,
    fallback: number,
    min: number,
    max: number
  ) => (
    <Field label={label}>
      <input
        type="number"
        name={key}
        min={min}
        max={max}
        step="1"
        defaultValue={studio?.[key] ?? fallback}
        required
      />
    </Field>
  );
  return (
    <section>
      <p className="eyebrow">{t("studio")}</p>
      <h1>{t("setup")}</h1>
      <p className="muted">{t("setupIntro")}</p>
      <form className="setup-form" onSubmit={(e) => void save(e)}>
        <fieldset>
          <legend>{t("location")}</legend>
          <div className="form-grid">
            <Field label={t("studioName")}>
              <input
                name="studioName"
                defaultValue={studio?.studioName ?? workspace?.name}
                required
                maxLength={120}
              />
            </Field>
            {!workspace ? (
              <Field label={t("country")}>
                <input name="country" defaultValue="DE" pattern="[A-Z]{2}" required />
              </Field>
            ) : null}
            <Field label={t("timezone")}>
              <input
                name="timezone"
                defaultValue={studio?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone}
                required
                list="timezones"
              />
              <datalist id="timezones">
                {[
                  "Europe/Berlin",
                  "Europe/London",
                  "America/New_York",
                  "Asia/Ho_Chi_Minh",
                  "UTC",
                ].map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </Field>
            <Field label={t("currency")}>
              <input
                name="currency"
                defaultValue={studio?.currency ?? "EUR"}
                pattern="[A-Z]{3}"
                required
              />
            </Field>
            <Field label={t("language")}>
              <select name="locale" defaultValue={studio?.locale ?? locale}>
                {Object.entries(languageNames).map(([value, name]) => (
                  <option key={value} value={value} lang={value}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </fieldset>
        <fieldset>
          <legend>{t("service")}</legend>
          <div className="form-grid">
            <Field label={t("serviceName")}>
              <input
                name="serviceName"
                defaultValue={studio?.serviceName}
                required
                maxLength={120}
              />
            </Field>
            {numeric("durationMinutes", t("duration"), 45, 5, 480)}
            <Field label={t("price")}>
              <input
                name="price"
                inputMode="decimal"
                pattern="[0-9]+([.,][0-9]{1,2})?"
                defaultValue={((studio?.priceCents ?? 3500) / 100).toFixed(2)}
                required
              />
            </Field>
            {numeric("bufferBeforeMinutes", t("bufferBefore"), 0, 0, 120)}
            {numeric("bufferAfterMinutes", t("bufferAfter"), 10, 0, 120)}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t("staff")}</legend>
          <Field label={t("staffName")}>
            <input name="staffName" defaultValue={studio?.staffName} required maxLength={120} />
          </Field>
        </fieldset>
        <fieldset>
          <legend>{t("hours")}</legend>
          <p className="muted">{t("hoursHelp")}</p>
          {[1, 2, 3, 4, 5, 6, 0].map((day) => {
            const slot = hours.find((h) => h.dayOfWeek === day);
            const dayName = new Intl.DateTimeFormat(locale, {
              weekday: "long",
              timeZone: "UTC",
            }).format(new Date(Date.UTC(2026, 9, 4 + day)));
            return (
              <div className="hours-row" key={day}>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={Boolean(slot)}
                    onChange={(e) =>
                      setHours(
                        e.target.checked
                          ? [...hours, { dayOfWeek: day, startTime: "09:00", endTime: "18:00" }]
                          : hours.filter((h) => h.dayOfWeek !== day)
                      )
                    }
                  />
                  {dayName}
                </label>
                {slot ? (
                  <>
                    <input
                      aria-label={`${dayName}: ${t("opens")}`}
                      type="time"
                      value={slot.startTime}
                      required
                      onChange={(e) =>
                        setHours(
                          hours.map((h) =>
                            h.dayOfWeek === day ? { ...h, startTime: e.target.value } : h
                          )
                        )
                      }
                    />
                    <span>—</span>
                    <input
                      aria-label={`${dayName}: ${t("closes")}`}
                      type="time"
                      value={slot.endTime}
                      required
                      onChange={(e) =>
                        setHours(
                          hours.map((h) =>
                            h.dayOfWeek === day ? { ...h, endTime: e.target.value } : h
                          )
                        )
                      }
                    />
                  </>
                ) : null}
              </div>
            );
          })}
        </fieldset>
        <fieldset>
          <legend>{t("block")}</legend>
          <p className="muted">
            {t("blockHelp")} ({Intl.DateTimeFormat().resolvedOptions().timeZone})
          </p>
          <div className="form-grid">
            <Field label={t("blockStart")}>
              <input type="datetime-local" ref={startRef} />
            </Field>
            <Field label={t("blockEnd")}>
              <input type="datetime-local" ref={endRef} />
            </Field>
          </div>
          <button
            type="button"
            className="button secondary small"
            onClick={() => {
              const a = startRef.current?.value;
              const b = endRef.current?.value;
              if (a && b && new Date(a) < new Date(b)) {
                setBlocks([
                  ...blocks,
                  { startAt: new Date(a).toISOString(), endAt: new Date(b).toISOString() },
                ]);
              }
            }}
          >
            {t("addBlock")}
          </button>
          {blocks.map((b, i) => (
            <div className="block-row" key={`${b.startAt}-${i}`}>
              <span>
                {new Date(b.startAt).toLocaleString(locale)} —{" "}
                {new Date(b.endAt).toLocaleString(locale)}
              </span>
              <button
                type="button"
                className="text-button"
                onClick={() => setBlocks(blocks.filter((_, n) => n !== i))}
              >
                {t("remove")}
              </button>
            </div>
          ))}
        </fieldset>
        <fieldset>
          <div className="form-grid">
            {numeric("minimumNoticeMinutes", t("notice"), 60, 0, 10080)}
            {numeric("maximumAdvanceDays", t("advance"), 60, 1, 180)}
          </div>
        </fieldset>
        {error ? <ErrorMessage message="setupError" /> : null}
        <button className="button" disabled={pending}>
          {pending ? t("saving") : t("publish")} ↗
        </button>
      </form>
    </section>
  );
}
