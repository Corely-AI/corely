import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@corely/ui";
import { CreateRegisterInputSchema } from "@corely/contracts";
import { posRegistersApi } from "@corely/web-shared/lib/pos-registers-api";
import { posRegisterKeys } from "../queries";

export function PosRegisterNewScreen() {
  const uiCopy = useUiCopy("ui.pos-registers-posregisternewscreen");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [defaultWarehouseId, setDefaultWarehouseId] = useState("");
  const [defaultBankAccountId, setDefaultBankAccountId] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const input = CreateRegisterInputSchema.parse({
        name: name.trim(),
        defaultWarehouseId: defaultWarehouseId.trim() || undefined,
        defaultBankAccountId: defaultBankAccountId.trim() || undefined,
      });
      return posRegistersApi.createRegister(input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: posRegisterKeys.list() });
      toast.success(uiCopy("pos-register-created"));
      navigate("/pos/admin/registers");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create POS register");
    },
  });

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>{uiCopy("new-pos-register")}</CardTitle>
          <CardDescription>{uiCopy("create-a-selling-station")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pos-register-name">{uiCopy("register-name")}</Label>
            <Input
              id="pos-register-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={uiCopy("front-counter-ipad")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos-register-warehouse">{uiCopy("default-warehouse-id")}</Label>
            <Input
              id="pos-register-warehouse"
              value={defaultWarehouseId}
              onChange={(event) => setDefaultWarehouseId(event.target.value)}
              placeholder={uiCopy("optional-uuid")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos-register-bank">{uiCopy("default-bank-account-id")}</Label>
            <Input
              id="pos-register-bank"
              value={defaultBankAccountId}
              onChange={(event) => setDefaultBankAccountId(event.target.value)}
              placeholder={uiCopy("optional-uuid")}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate("/pos/admin/registers")}>
              {uiCopy("cancel")}
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !name.trim()}
            >
              {uiCopy("create-register")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
