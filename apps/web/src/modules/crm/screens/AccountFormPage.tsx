import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { crmApi } from "@/lib/crm-api";
import type { CreateAccountInput, CrmAccountType, AccountStatus } from "@corely/contracts";

type FormData = {
  name: string;
  email: string;
  phone: string;
  website: string;
  industry: string;
  accountType: string;
  status: string;
  ownerUserId: string;
  notes: string;
};

const EMPTY_FORM: FormData = {
  name: "",
  email: "",
  phone: "",
  website: "",
  industry: "",
  accountType: "CUSTOMER",
  status: "ACTIVE",
  ownerUserId: "",
  notes: "",
};

export default function AccountFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  // Load existing account if editing
  const { data: existing } = useQuery({
    queryKey: ["account", id],
    queryFn: () => crmApi.getAccount(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        email: existing.email ?? "",
        phone: existing.phone ?? "",
        website: existing.website ?? "",
        industry: existing.industry ?? "",
        accountType: existing.accountType,
        status: existing.status,
        ownerUserId: existing.ownerUserId ?? "",
        notes: existing.notes ?? "",
      });
    }
  }, [existing]);

  const createMutation = useMutation({
    mutationFn: (input: CreateAccountInput) => crmApi.createAccount(input),
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      navigate(`/crm/accounts/${account.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => crmApi.updateAccount(id!, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account", id] });
      navigate(`/crm/accounts/${id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      website: form.website || undefined,
      industry: form.industry || undefined,
      accountType: form.accountType as CrmAccountType,
      status: form.status as AccountStatus,
      ownerUserId: form.ownerUserId || undefined,
      notes: form.notes || undefined,
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload as CreateAccountInput);
    }
  };

  const setField = (key: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-h1 text-foreground">
          {isEdit ? "Edit Account" : "New Account"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identity Section (writes to Party) */}
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <p className="text-xs text-muted-foreground">
              Contact information stored in Party record
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Account Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                required
                data-testid="crm-account-name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                data-testid="crm-account-email"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                data-testid="crm-account-phone"
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(e) => setField("website", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={form.industry}
                onChange={(e) => setField("industry", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* CRM Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>CRM Profile</CardTitle>
            <p className="text-xs text-muted-foreground">
              Sales-specific fields
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="accountType">Account Type</Label>
              <select
                id="accountType"
                value={form.accountType}
                onChange={(e) => setField("accountType", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                data-testid="crm-account-type"
              >
                <option value="CUSTOMER">Customer</option>
                <option value="VENDOR">Vendor</option>
                <option value="PARTNER">Partner</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                data-testid="crm-account-status"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="PROSPECT">Prospect</option>
              </select>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                rows={4}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" disabled={isPending} data-testid="crm-account-save">
            <Save className="h-4 w-4" />
            {isPending ? "Saving..." : isEdit ? "Update Account" : "Create Account"}
          </Button>
        </div>
      </form>
    </div>
  );
}
