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
      title="POS Registers"
      subtitle="Manage selling stations and device-level shift scopes. Cash drawers stay separate and bind explicitly."
      primaryAction={
        canManageRegisters ? (
          <Button asChild>
            <Link to="/pos/admin/registers/new">
              <Plus className="mr-2 h-4 w-4" />
              New register
            </Link>
          </Button>
        ) : undefined
      }
      filters={
        <>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, register ID, or cash drawer"
            className="w-72"
          />
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as RegisterStatusFilter)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </>
      }
    >
      {registersQuery.isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Loading POS registers...</div>
      ) : registersQuery.isError ? (
        <div className="p-6 text-sm text-destructive">Failed to load POS registers.</div>
      ) : filteredRegisters.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">
          No POS registers found for this workspace.
        </div>
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
                    <dt className="text-muted-foreground">Cash drawer</dt>
                    <dd>{formatOptionalId(register.cashDrawerId)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Default warehouse</dt>
                    <dd>{formatOptionalId(register.defaultWarehouseId)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Default bank</dt>
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
