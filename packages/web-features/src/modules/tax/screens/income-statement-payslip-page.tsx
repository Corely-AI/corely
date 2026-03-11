import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  Button,
  Calendar,
  Card,
  CardContent,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableRow,
  cn,
} from "@corely/ui";
import { useNavigate, useParams } from "react-router-dom";

type PayslipPartner = "spouse" | "main-partner";
type SimpleRowKind = "money" | "unsupported";

type SimplePayslipRow = {
  id: string;
  kind: "simple";
  label: string;
  rowNumber: number;
  valueType: SimpleRowKind;
};

type GroupedPayslipRow = {
  id: string;
  kind: "group";
  groupLabel: string;
  rowNumber: number;
  children: Array<{
    id: string;
    label: string;
    valueType: SimpleRowKind;
  }>;
};

type PayslipRow = SimplePayslipRow | GroupedPayslipRow;

const TAX_CLASS_OPTIONS = ["I", "II", "III", "IV", "V", "VI"] as const;

const PAYSLIP_ROWS: PayslipRow[] = [
  {
    id: "2",
    kind: "simple",
    rowNumber: 2,
    label: "Zeitraeume ohne Anspruch auf Arbeitslohn",
    valueType: "unsupported",
  },
  {
    id: "3",
    kind: "simple",
    rowNumber: 3,
    label: "Bruttoarbeitslohn einschl. Sachbezuege ohne 9. und 10.",
    valueType: "money",
  },
  {
    id: "4",
    kind: "simple",
    rowNumber: 4,
    label: "Einbehaltene Lohnsteuer von 3.",
    valueType: "money",
  },
  {
    id: "5",
    kind: "simple",
    rowNumber: 5,
    label: "Einbehaltener Solidaritaetszuschlag von 3.",
    valueType: "money",
  },
  {
    id: "6",
    kind: "simple",
    rowNumber: 6,
    label: "Einbehaltene Kirchensteuer des Arbeitnehmers von 3.",
    valueType: "money",
  },
  {
    id: "7",
    kind: "simple",
    rowNumber: 7,
    label: "Einbehaltene Kirchensteuer des Ehegatten/Lebenspartners von 3.",
    valueType: "money",
  },
  {
    id: "8",
    kind: "simple",
    rowNumber: 8,
    label: "In 3. enthaltene Versorgungsbezuege",
    valueType: "unsupported",
  },
  {
    id: "9",
    kind: "simple",
    rowNumber: 9,
    label: "Ermaessigt besteuerte Versorgungsbezuege fuer mehrere Kalenderjahre",
    valueType: "unsupported",
  },
  {
    id: "10",
    kind: "simple",
    rowNumber: 10,
    label: "Ermaessigt besteuerter Arbeitslohn",
    valueType: "money",
  },
  {
    id: "11",
    kind: "simple",
    rowNumber: 11,
    label: "Einbehaltene Lohnsteuer von 9. und 10.",
    valueType: "money",
  },
  {
    id: "12",
    kind: "simple",
    rowNumber: 12,
    label: "Einbehaltener Solidaritaetszuschlag von 9. und 10.",
    valueType: "money",
  },
  {
    id: "13",
    kind: "simple",
    rowNumber: 13,
    label: "Einbehaltene Kirchensteuer des Arbeitnehmers von 9. und 10.",
    valueType: "money",
  },
  {
    id: "14",
    kind: "simple",
    rowNumber: 14,
    label: "Einbehaltene Kirchensteuer des Ehegatten/Lebenspartners von 9. und 10.",
    valueType: "money",
  },
  {
    id: "15",
    kind: "simple",
    rowNumber: 15,
    label: "Kurzarbeitergeld, Zuschuss zum Mutterschaftsgeld...",
    valueType: "money",
  },
  {
    id: "16",
    kind: "group",
    rowNumber: 16,
    groupLabel: "Steuerfreier Arbeitslohn",
    children: [
      { id: "16a", label: "a) Doppelbesteuerungsabkommen (DBA)", valueType: "unsupported" },
      { id: "16b", label: "b) Auslandstaetigkeit", valueType: "unsupported" },
    ],
  },
  {
    id: "17",
    kind: "simple",
    rowNumber: 17,
    label:
      "Steuerfreie Arbeitgeberleistungen fuer Fahrten zwischen Wohnung und erster Taetigkeitsstaette",
    valueType: "money",
  },
  {
    id: "18",
    kind: "simple",
    rowNumber: 18,
    label:
      "Pauschalbesteuerte Arbeitgeberleistungen fuer Fahrten zwischen Wohnung und erster Taetigkeitsstaette",
    valueType: "money",
  },
  {
    id: "19",
    kind: "simple",
    rowNumber: 19,
    label:
      "Steuerpflichtige Entschaedigungen und Arbeitslohn fuer mehrere Kalenderjahre, die nicht ermaessigt besteuert wurden in 3. enthalten",
    valueType: "unsupported",
  },
  {
    id: "20",
    kind: "simple",
    rowNumber: 20,
    label: "Steuerfreie Verpflegungszuschuesse bei Auswaertstaetigkeit",
    valueType: "money",
  },
  {
    id: "21",
    kind: "simple",
    rowNumber: 21,
    label: "Steuerfreie Arbeitgeberleistungen bei doppelter Haushaltsfuehrung",
    valueType: "unsupported",
  },
  {
    id: "22",
    kind: "group",
    rowNumber: 22,
    groupLabel: "Arbeitgeberanteil",
    children: [
      { id: "22a", label: "a) zur gesetzlichen Rentenversicherung", valueType: "money" },
      { id: "22b", label: "b) an berufsstaendische Versorgungseinrichtungen", valueType: "money" },
    ],
  },
  {
    id: "23",
    kind: "group",
    rowNumber: 23,
    groupLabel: "Arbeitnehmeranteil",
    children: [
      { id: "23a", label: "a) zur gesetzlichen Rentenversicherung", valueType: "money" },
      { id: "23b", label: "b) an berufsstaendische Versorgungseinrichtungen", valueType: "money" },
    ],
  },
  {
    id: "24",
    kind: "group",
    rowNumber: 24,
    groupLabel: "Zuschuesse Arbeitgeber",
    children: [
      { id: "24a", label: "a) zur gesetzlichen Krankenversicherung", valueType: "money" },
      { id: "24b", label: "b) zur privaten Krankenversicherung", valueType: "money" },
      { id: "24c", label: "c) zur gesetzlichen Pflegeversicherung", valueType: "money" },
    ],
  },
  {
    id: "25",
    kind: "simple",
    rowNumber: 25,
    label: "Arbeitnehmerbeitraege zur gesetzlichen Krankenversicherung",
    valueType: "money",
  },
  {
    id: "26",
    kind: "simple",
    rowNumber: 26,
    label: "Arbeitnehmerbeitraege zur sozialen Pflegeversicherung",
    valueType: "money",
  },
  {
    id: "27",
    kind: "simple",
    rowNumber: 27,
    label: "Arbeitnehmerbeitraege zur Arbeitslosenversicherung",
    valueType: "money",
  },
  {
    id: "28",
    kind: "simple",
    rowNumber: 28,
    label:
      "Beitraege zur privaten Kranken und Pflege-Pflichtversicherung oder Mindestvorsorgepauschale",
    valueType: "unsupported",
  },
  {
    id: "29",
    kind: "simple",
    rowNumber: 29,
    label: "Bemessungsgrundlage fuer den Versorgungsfreibetrag zu 8.",
    valueType: "unsupported",
  },
  {
    id: "30",
    kind: "simple",
    rowNumber: 30,
    label: "Massgebendes Kalenderjahr des Versorgungsbeginns zu 8. und/oder 9.",
    valueType: "unsupported",
  },
  {
    id: "31",
    kind: "simple",
    rowNumber: 31,
    label:
      "Zu 8. bei unterjaehriger Zahlung: Erster und letzter Monat, fuer den Versorgungsbezuege gezahlt wurden",
    valueType: "unsupported",
  },
  {
    id: "32",
    kind: "simple",
    rowNumber: 32,
    label:
      "Sterbegeld;, Kapitalauszahlungen/Abfindungen und Nachzahlungen von Versorgungsbezuegen in 3. und 8. enthalten",
    valueType: "unsupported",
  },
  {
    id: "33",
    kind: "simple",
    rowNumber: 33,
    label: "Ausgezahltes Kindergeld",
    valueType: "unsupported",
  },
  {
    id: "34",
    kind: "simple",
    rowNumber: 34,
    label: "Freibetrag DBA Tuerkei",
    valueType: "unsupported",
  },
] as const;

const isValidPartner = (value: string | undefined): value is PayslipPartner =>
  value === "spouse" || value === "main-partner";

const formatDate = (value?: Date) => (value ? value.toLocaleDateString("de-DE") : "Select date...");

const TABLE_ROW_CLASS = "border-border/60 bg-card/70";

const UnsupportedCell = () => (
  <div className="flex h-16 items-center justify-end bg-muted/25 px-4 text-right text-base text-foreground/80 md:text-lg">
    Field not supported
  </div>
);

const MoneyCell = () => (
  <Input
    value=""
    readOnly
    placeholder="€ 0.00"
    className="h-16 rounded-none border-0 bg-background/70 text-xl text-foreground placeholder:text-muted-foreground shadow-none"
  />
);

export const IncomeStatementPayslipPage = () => {
  const navigate = useNavigate();
  const params = useParams<{ year: string; partner: string }>();
  const year = Number(params.year);
  const partner = params.partner;

  const [taxClass, setTaxClass] = React.useState("");
  const [periodStart, setPeriodStart] = React.useState<Date | undefined>();
  const [periodEnd, setPeriodEnd] = React.useState<Date | undefined>();

  if (!Number.isFinite(year) || year < 2000 || !isValidPartner(partner)) {
    return null;
  }

  const ownerLabel = partner === "spouse" ? "spouse" : "main partner";

  return (
    <div className="mx-auto max-w-[1500px] p-6 lg:p-8">
      <Card className="border-border/50 bg-card/95 shadow-sm">
        <CardContent className="space-y-10 p-8 lg:p-10">
          <div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(-1)}
              className="gap-2 px-0 text-base text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold leading-tight text-foreground">
              Enter the information as stated on your annual payslip (Lohnsteuerbescheinigung)
            </h1>
            <p className="max-w-6xl text-[2rem] leading-tight text-foreground/70">
              The annual payslip (Lohnsteuerbescheinigung) is a statement that contains a summary of
              the salary you have received and taxes paid by your employer during the year. You
              should receive it from your employer at the end of the year.
            </p>
            <p className="text-sm text-muted-foreground">
              Filing year: {year} · Partner: {ownerLabel}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[300px_400px] md:items-center">
            <div className="text-2xl text-foreground">Tax class (Steuerklasse)</div>
            <Select value={taxClass} onValueChange={setTaxClass}>
              <SelectTrigger className="h-16 text-2xl">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {TAX_CLASS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableBody>
              <TableRow className={TABLE_ROW_CLASS}>
                <TableCell className="w-[54%] text-xl text-foreground">
                  1. Bescheinigungszeitraum
                </TableCell>
                <TableCell className="w-[22%] p-0">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "h-16 w-full justify-start rounded-none bg-background/70 px-5 text-xl font-normal text-foreground hover:bg-background/80",
                          !periodStart && "text-muted-foreground"
                        )}
                      >
                        {formatDate(periodStart)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={periodStart} onSelect={setPeriodStart} />
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell className="w-[6%] p-0 text-center">
                  <ArrowRight className="mx-auto h-8 w-8 text-foreground/80" />
                </TableCell>
                <TableCell className="w-[18%] p-0">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "h-16 w-full justify-start rounded-none bg-background/70 px-5 text-xl font-normal text-foreground hover:bg-background/80",
                          !periodEnd && "text-muted-foreground"
                        )}
                      >
                        {formatDate(periodEnd)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={periodEnd} onSelect={setPeriodEnd} />
                    </PopoverContent>
                  </Popover>
                </TableCell>
              </TableRow>

              {PAYSLIP_ROWS.map((row) =>
                row.kind === "simple" ? (
                  <TableRow key={row.id} className={TABLE_ROW_CLASS}>
                    <TableCell colSpan={3} className="text-xl text-foreground">
                      {row.rowNumber}. {row.label}
                    </TableCell>
                    <TableCell className="p-0">
                      {row.valueType === "money" ? <MoneyCell /> : <UnsupportedCell />}
                    </TableCell>
                  </TableRow>
                ) : (
                  row.children.map((child, childIndex) => (
                    <TableRow key={child.id} className={TABLE_ROW_CLASS}>
                      {childIndex === 0 ? (
                        <TableCell
                          rowSpan={row.children.length}
                          className="align-top text-xl text-foreground"
                        >
                          {row.rowNumber}. {row.groupLabel}
                        </TableCell>
                      ) : null}
                      <TableCell colSpan={2} className="text-xl text-foreground">
                        {child.label}
                      </TableCell>
                      <TableCell className="p-0">
                        {child.valueType === "money" ? <MoneyCell /> : <UnsupportedCell />}
                      </TableCell>
                    </TableRow>
                  ))
                )
              )}
            </TableBody>
          </Table>

          <div className="flex justify-end">
            <Button className="rounded-full px-8">Save</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncomeStatementPayslipPage;
