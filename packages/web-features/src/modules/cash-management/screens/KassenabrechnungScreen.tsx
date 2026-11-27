import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button, Card, CardContent, Input } from "@corely/ui";
import { cashManagementApi } from "@corely/web-shared/lib/cash-management-api";

const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const currentMonth = () => {
  const now = new Date();
  return {
    from: localDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: localDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};
const money = (cents: number, currency: string) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(cents / 100);

export function KassenabrechnungScreen() {
  const uiCopy = useUiCopy("ui.cash-management-kassenabrechnungscreen");
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const defaults = currentMonth();
  const [from, setFrom] = useState(params.get("from") ?? defaults.from);
  const [to, setTo] = useState(params.get("to") ?? defaults.to);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const selectedFrom = params.get("from") ?? defaults.from;
  const selectedTo = params.get("to") ?? defaults.to;
  useEffect(() => {
    if (!params.get("from") || !params.get("to")) {
      setParams({ from: selectedFrom, to: selectedTo }, { replace: true });
    }
  }, [params, selectedFrom, selectedTo, setParams]);
  const report = useQuery({
    queryKey: ["cash-kassenabrechnung", id, selectedFrom, selectedTo],
    queryFn: () => cashManagementApi.getKassenabrechnung(id!, selectedFrom, selectedTo),
    enabled: Boolean(id) && selectedFrom <= selectedTo,
  });
  const translate = useMutation({
    mutationFn: () => cashManagementApi.translateKassenabrechnung(id!, selectedFrom, selectedTo),
    onSuccess: ({ translations: result }) => setTranslations(result),
  });
  const apply = () => {
    if (from <= to) {
      setParams({ from, to });
    }
  };
  const print = () => {
    if (!report.data) {
      return;
    }
    const previous = document.title;
    document.title = `Kassenabrechnung_${report.data.report.register.name.replace(/[^a-z0-9]+/gi, "-")}_${selectedFrom}_${selectedTo}`;
    window.print();
    window.setTimeout(() => {
      document.title = previous;
    }, 1000);
  };
  if (!id) {
    return null;
  }
  const data = report.data?.report;
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="print:hidden flex items-center justify-between gap-3">
        <Link to={`/cash/registers/${id}`}>
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {uiCopy("zuru-ck")}
          </Button>
        </Link>
        <Button onClick={print} disabled={!data}>
          <Printer className="mr-2 h-4 w-4" />
          {uiCopy("als-pdf-exportieren")}
        </Button>
      </div>
      <Card className="print:hidden">
        <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-end">
          <label className="grid gap-1 text-sm">
            {uiCopy("von")}
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            {uiCopy("bis")}
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <Button
            variant="outline"
            onClick={() => {
              const range = currentMonth();
              setFrom(range.from);
              setTo(range.to);
              setParams({ from: range.from, to: range.to });
            }}
          >
            {uiCopy("aktueller-monat")}
          </Button>
          <Button onClick={apply} disabled={from > to}>
            {uiCopy("bericht-erstellen")}
          </Button>
          <Button
            variant="outline"
            onClick={() => translate.mutate()}
            disabled={!data || translate.isPending}
          >
            {translate.isPending ? uiCopy("u-bersetze") : uiCopy("vietnamesisch-deutsch")}
          </Button>
        </CardContent>
      </Card>
      {from > to && (
        <p className="text-sm text-destructive">{uiCopy("das-anfangsdatum-darf-nicht")}</p>
      )}
      {report.isLoading && (
        <p className="text-sm text-muted-foreground">{uiCopy("kassenabrechnung-wird-geladen")}</p>
      )}
      {report.isError && (
        <p className="text-sm text-destructive">{uiCopy("die-kassenabrechnung-konnte-nicht")}</p>
      )}
      {data && (
        <article
          className="cash-reconciliation-report cash-form mx-auto bg-white text-black shadow print:shadow-none"
          data-testid="kassenabrechnung-report"
        >
          <header className="cash-form-header">
            <h1>{uiCopy("kassenabrechnung")}</h1>
            <div className="cash-form-fields">
              <span>
                {uiCopy("von-2") + " "}
                <b>{data.fromDate}</b>
              </span>
              <span>
                {uiCopy("bis-2") + " "}
                <b>{data.toDate}</b>
              </span>
              <span>
                {uiCopy("kasse-filiale") + " "}
                <b>{data.register.name}</b>
              </span>
              <span>
                {uiCopy("wa-hrung") + " "}
                <b>{data.register.currency}</b>
              </span>
            </div>
          </header>
          <table className="cash-form-table">
            <thead>
              <tr>
                <th rowSpan={2}>{uiCopy("tag")}</th>
                <th rowSpan={2}>
                  {uiCopy("beleg")}
                  <br />
                  {uiCopy("nr")}
                </th>
                <th rowSpan={2}>{uiCopy("beschreibung-art-der-kassenbewegung")}</th>
                <th colSpan={1}>{uiCopy("einnahmen")}</th>
                <th colSpan={1}>{uiCopy("ausgaben")}</th>
                <th rowSpan={2}>
                  {uiCopy("kassen")}
                  <br />
                  {uiCopy("bestand")}
                </th>
              </tr>
              <tr>
                <th>{uiCopy("betrag")}</th>
                <th>{uiCopy("betrag")}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="cash-form-carry">
                <td colSpan={3}>{uiCopy("u-bertrag-kassenbestand-vor")}</td>
                <td />
                <td />
                <td>{money(data.openingBalanceCents, data.register.currency)}</td>
              </tr>
              {data.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.dayKey.slice(8)}</td>
                  <td>{row.receiptNumber ?? row.entryNo}</td>
                  <td>{translations[row.id] ?? row.description}</td>
                  <td>
                    {row.direction === "IN" ? money(row.amountCents, data.register.currency) : ""}
                  </td>
                  <td>
                    {row.direction === "OUT" ? money(row.amountCents, data.register.currency) : ""}
                  </td>
                  <td>{money(row.balanceAfterCents, data.register.currency)}</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 24 - data.rows.length) }, (_, index) => (
                <tr className="cash-form-empty" key={`empty-${index}`}>
                  <td>&nbsp;</td>
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
          <section className="cash-form-total">
            <div>
              <span>{uiCopy("summe-einnahmen")}</span>
              <b>{money(data.totalIncomeCents, data.register.currency)}</b>
            </div>
            <div>
              <span>{uiCopy("summe-ausgaben")}</span>
              <b>{money(data.totalExpenseCents, data.register.currency)}</b>
            </div>
            <div>
              <span>{uiCopy("endbestand")}</span>
              <b>{money(data.calculatedClosingBalanceCents, data.register.currency)}</b>
            </div>
            <div>
              <span>{uiCopy("geza-hlter-bestand-differenz")}</span>
              <b>
                {data.actualCountedClosingBalanceCents === null
                  ? "–"
                  : `${money(data.actualCountedClosingBalanceCents, data.register.currency)} / ${money(data.differenceCents ?? 0, data.register.currency)}`}
              </b>
            </div>
          </section>
          <footer className="cash-form-footer">
            <span>{uiCopy("datum")}</span>
            <span>{uiCopy("name")}</span>
            <span>{uiCopy("unterschrift")}</span>
            <span>{uiCopy("gepru-ft")}</span>
          </footer>
        </article>
      )}
    </div>
  );
}
