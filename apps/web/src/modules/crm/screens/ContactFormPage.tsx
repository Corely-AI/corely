import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@corely/ui";
import { customersApi } from "@/lib/customers-api";
import { toast } from "sonner";

export default function ContactFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const { data: existing } = useQuery({
    queryKey: ["crm-contact", id],
    queryFn: () => customersApi.getCustomer(id!, "CONTACT"),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setName(existing.displayName ?? "");
      setEmail(existing.email ?? "");
      setPhone(existing.phone ?? "");
    }
  }, [existing]);

  const createMutation = useMutation({
    mutationFn: () =>
      customersApi.createCustomer({
        role: "CONTACT",
        kind: "INDIVIDUAL",
        displayName: name,
        email: email || undefined,
        phone: phone || undefined,
      }),
    onSuccess: (contact) => {
      void queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      navigate(`/crm/contacts/${contact.id}`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Failed to create contact"),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      customersApi.updateCustomer(
        id!,
        {
          displayName: name,
          email: email || undefined,
          phone: phone || undefined,
        },
        "CONTACT"
      ),
    onSuccess: (contact) => {
      void queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      void queryClient.invalidateQueries({ queryKey: ["crm-contact", id] });
      navigate(`/crm/contacts/${contact.id}`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Failed to update contact"),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/crm/contacts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-h1 text-foreground">{isEdit ? "Edit Contact" : "New Contact"}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (isEdit) {
                updateMutation.mutate();
              } else {
                createMutation.mutate();
              }
            }}
            data-testid="crm-contact-form"
          >
            <div>
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="crm-contact-name"
              />
            </div>
            <div>
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="crm-contact-email"
              />
            </div>
            <div>
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                data-testid="crm-contact-phone"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="accent"
                disabled={isPending}
                data-testid="crm-contact-save"
              >
                {isPending ? "Saving..." : isEdit ? "Update Contact" : "Create Contact"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
