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
      toast.success("POS register created");
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
          <CardTitle>New POS Register</CardTitle>
          <CardDescription>
            Create a selling station. Cash drawers remain separate and bind later through the
            POS-to-cash bridge.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pos-register-name">Register name</Label>
            <Input
              id="pos-register-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Front counter iPad"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos-register-warehouse">Default warehouse ID</Label>
            <Input
              id="pos-register-warehouse"
              value={defaultWarehouseId}
              onChange={(event) => setDefaultWarehouseId(event.target.value)}
              placeholder="Optional UUID"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos-register-bank">Default bank account ID</Label>
            <Input
              id="pos-register-bank"
              value={defaultBankAccountId}
              onChange={(event) => setDefaultBankAccountId(event.target.value)}
              placeholder="Optional UUID"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate("/pos/admin/registers")}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !name.trim()}
            >
              Create register
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
