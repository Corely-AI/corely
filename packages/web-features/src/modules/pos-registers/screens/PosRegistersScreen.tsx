import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@corely/ui";
import { Plus } from "lucide-react";
import { CrudListPageLayout } from "@corely/web-shared/shared/crud";
import { posRegistersApi } from "@corely/web-shared/lib/pos-registers-api";
import { usePosRegisterPermissions } from "../access";
import { posRegisterKeys } from "../queries";

type RegisterStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const formatOptionalId = (value: string | null) => {
  if (!value) {
    return "Unassigned";
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
};

export function PosRegistersScreen() {
  const uiCopy = useUiCopy("ui.pos-registers-posregistersscreen");
  const { canManageRegisters } = usePosRegisterPermissions();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RegisterStatusFilter>("ALL");

  const queryParams = useMemo(
    () => ({
      status: status === "ALL" ? undefined : status,
    }),
    [status]
  );

  const registersQuery = useQuery({
    queryKey: posRegisterKeys.list(queryParams),
    queryFn: () => posRegistersApi.listRegisters(queryParams),
  });

  const filteredRegisters = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (registersQuery.data?.registers ?? []).filter((register) => {
      if (!normalized) {
        return true;
      }

      return (
        register.name.toLowerCase().includes(normalized) ||
        register.registerId.toLowerCase().includes(normalized) ||
        (register.cashDrawerId ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [query, registersQuery.data?.registers]);

  return (
    <CrudListPageLayout
      title={uiCopy("pos-registers")}
      subtitle="Manage selling stations and device-level shift scopes. Cash drawers stay separate and bind explicitly."
      primaryAction={
        canManageRegisters ? (
          <Button asChild>
            <Link to="/pos/admin/registers/new">
              <Plus className="mr-2 h-4 w-4" />
              {uiCopy("new-register")}
            </Link>
          </Button>
        ) : undefined
      }
      filters={
        <>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={uiCopy("search-name-register-id")}
            className="w-72"
          />
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as RegisterStatusFilter)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder={uiCopy("status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{uiCopy("all-statuses")}</SelectItem>
              <SelectItem value="ACTIVE">{uiCopy("active")}</SelectItem>
              <SelectItem value="INACTIVE">{uiCopy("inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </>
      }
    >
      {registersQuery.isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">{uiCopy("loading-pos-registers")}</div>
      ) : registersQuery.isError ? (
        <div className="p-6 text-sm text-destructive">{uiCopy("failed-to-load-pos")}</div>
      ) : filteredRegisters.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">{uiCopy("no-pos-registers-found")}</div>
      ) : (
        <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredRegisters.map((register) => (
            <Card key={register.registerId} className="border-border/70">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold">{register.name}</h2>
                    <p className="text-xs text-muted-foreground">{register.registerId}</p>
                  </div>
                  <Badge variant={register.status === "ACTIVE" ? "default" : "secondary"}>
                    {register.status}
                  </Badge>
                </div>

                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{uiCopy("cash-drawer")}</dt>
                    <dd>{formatOptionalId(register.cashDrawerId)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{uiCopy("default-warehouse")}</dt>
                    <dd>{formatOptionalId(register.defaultWarehouseId)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{uiCopy("default-bank")}</dt>
                    <dd>{formatOptionalId(register.defaultBankAccountId)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </CrudListPageLayout>
  );
}
