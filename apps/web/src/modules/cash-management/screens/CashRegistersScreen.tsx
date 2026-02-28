import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Input } from "@corely/ui";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CrudListPageLayout, CrudRowActions } from "@/shared/crud";
import { formatMoney } from "@/shared/lib/formatters";
import { cashManagementApi } from "@/lib/cash-management-api";
import { cashKeys } from "../queries";

type RegisterFilters = {
  q: string;
  location: string;
  currency: string;
};

const defaultFilters: RegisterFilters = {
  q: "",
  location: "",
  currency: "",
};

export function CashRegistersScreen() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<RegisterFilters>(defaultFilters);

  const queryParams = useMemo(
    () => ({
      q: filters.q || undefined,
      location: filters.location || undefined,
      currency: filters.currency || undefined,
    }),
    [filters]
  );

  const registersQuery = useQuery({
    queryKey: cashKeys.registers.list(queryParams),
    queryFn: () => cashManagementApi.listRegisters(queryParams),
  });

  const registers = registersQuery.data?.registers ?? [];

  return (
    <CrudListPageLayout
      title={t("cash.ui.registers.title")}
      subtitle={t("cash.ui.registers.subtitle")}
      primaryAction={
        <Button asChild>
          <Link to="/cash/registers/new">
            <Plus className="mr-2 h-4 w-4" />
            {t("cash.ui.registers.newRegister")}
          </Link>
        </Button>
      }
      filters={
        <>
          <Input
            value={filters.q}
            onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
            placeholder={t("cash.ui.registers.searchPlaceholder")}
            className="w-60"
          />
          <Input
            value={filters.location}
            onChange={(event) => setFilters((prev) => ({ ...prev, location: event.target.value }))}
            placeholder={t("cash.ui.registers.locationPlaceholder")}
            className="w-48"
          />
          <Input
            value={filters.currency}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))
            }
            placeholder={t("cash.ui.registers.currencyPlaceholder")}
            className="w-32"
            maxLength={3}
          />
        </>
      }
    >
      {registersQuery.isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">{t("cash.ui.registers.loading")}</div>
      ) : registersQuery.isError ? (
        <div className="p-6 text-sm text-destructive">{t("cash.ui.registers.loadFailed")}</div>
      ) : registers.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">{t("cash.ui.registers.empty")}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">{t("cash.ui.registers.table.name")}</th>
                <th className="px-4 py-3 font-medium">{t("cash.ui.registers.table.location")}</th>
                <th className="px-4 py-3 font-medium">{t("cash.ui.registers.table.currency")}</th>
                <th className="px-4 py-3 font-medium text-right">
                  {t("cash.ui.registers.table.currentBalance")}
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  {t("cash.ui.registers.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {registers.map((register) => (
                <tr key={register.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{register.name}</td>
                  <td className="px-4 py-3">{register.location ?? "-"}</td>
                  <td className="px-4 py-3">{register.currency}</td>
                  <td className="px-4 py-3 text-right">
                    {formatMoney(register.currentBalanceCents, undefined, register.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <CrudRowActions
                      primaryAction={{
                        label: t("cash.ui.registers.open"),
                        href: `/cash/registers/${register.id}`,
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CrudListPageLayout>
  );
}
