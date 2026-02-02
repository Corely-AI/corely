import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/shared/ui/dialog";
import { formatMoney } from "@/shared/lib/formatters";
import { cashManagementApi } from "@/lib/cash-management-api";
import { cashKeys } from "../queries";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function CashRegistersScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: cashKeys.registers.list.queryKey,
    queryFn: () => cashManagementApi.listRegisters(),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      cashManagementApi.createRegister({
        tenantId: "current",
        name,
        currency: "EUR",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: cashKeys.registers.list.queryKey });
      setIsCreateOpen(false);
      setNewName("");
      toast.success(t("cash.registers.created"));
    },
    onError: () => toast.error(t("cash.registers.createFailed")),
  });

  const registers = data?.registers ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("cash.title")}</h1>
          <p className="text-muted-foreground">{t("cash.subtitle")}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("cash.registers.add")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("cash.registers.addTitle")}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <label className="text-sm font-medium mb-2 block">{t("common.name")}</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("cash.registers.namePlaceholder")}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => createMutation.mutate(newName)}
                disabled={!newName || createMutation.isPending}
              >
                {t("common.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div>{t("common.loading")}</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {registers.map((reg) => (
            <Link key={reg.id} to={`/cash-registers/${reg.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-muted-foreground" />
                    {reg.name}
                  </CardTitle>
                  <CardDescription>
                    {reg.location || t("cash.registers.noLocation")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatMoney(reg.currentBalanceCents, reg.currency)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("cash.registers.currentBalance")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {registers.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-10">
              {t("cash.registers.empty")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
