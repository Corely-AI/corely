import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
} from "@corely/ui";
import { cashManagementApi } from "@/lib/cash-management-api";
import { cashKeys, invalidateCashRegisterQueries } from "../queries";
import { useQueryClient } from "@tanstack/react-query";

export function CashRegisterEditScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [disallowNegativeBalance, setDisallowNegativeBalance] = useState(false);

  const registerQuery = useQuery({
    queryKey: id ? cashKeys.registers.detail(id) : ["cash-registers", "missing-id"],
    queryFn: () => cashManagementApi.getRegister(id as string),
    enabled: Boolean(id),
  });

  const register = registerQuery.data?.register;

  const updateMutation = useMutation({
    mutationFn: () =>
      cashManagementApi.updateRegister(id as string, {
        name: name.trim() || undefined,
        location: location.trim() || null,
        disallowNegativeBalance,
      }),
    onSuccess: async () => {
      if (!id) {
        return;
      }
      await invalidateCashRegisterQueries(queryClient, id);
      navigate(`/cash/registers/${id}`);
    },
  });

  useEffect(() => {
    if (!register) {
      return;
    }
    setName(register.name);
    setLocation(register.location ?? "");
    setDisallowNegativeBalance(register.disallowNegativeBalance ?? false);
  }, [register]);

  if (!id) {
    return null;
  }

  if (registerQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading register...</div>;
  }

  if (!register) {
    return <div className="p-6 text-sm text-destructive">Cash register not found.</div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit cash register</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="register-name">Name</Label>
            <Input
              id="register-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Main register"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-location">Location</Label>
            <Input
              id="register-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Front desk"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={disallowNegativeBalance}
              onCheckedChange={(value) => setDisallowNegativeBalance(value === true)}
            />
            Disallow negative cash balance
          </label>
          {updateMutation.isError ? (
            <p className="text-sm text-destructive">Failed to update register.</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(`/cash/registers/${id}`)}>
              Cancel
            </Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
