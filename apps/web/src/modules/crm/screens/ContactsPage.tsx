import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Plus } from "lucide-react";
import { Button, Card, CardContent } from "@corely/ui";
import { EmptyState } from "@/shared/components/EmptyState";
import { customersApi } from "@/lib/customers-api";

export default function ContactsPage() {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["crm-contacts"],
    queryFn: () => customersApi.listCustomers({ role: "CONTACT" }),
  });

  const contacts = data?.customers ?? [];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="crm-contacts-page">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground" data-testid="crm-contacts-header">
          Contacts
        </h1>
        <Button
          variant="accent"
          onClick={() => navigate("/crm/contacts/new")}
          data-testid="crm-contacts-create"
        >
          <Plus className="h-4 w-4" />
          New Contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <Card data-testid="crm-contacts-empty">
          <CardContent className="p-0">
            <EmptyState
              icon={Users}
              title="No contacts found"
              description="Create a contact to get started."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3" data-testid="crm-contacts-list">
          {contacts.map((contact) => (
            <Card
              key={contact.id}
              className="cursor-pointer hover:bg-accent/5 transition-colors"
              onClick={() => navigate(`/crm/contacts/${contact.id}`)}
              data-testid={`crm-contact-row-${contact.id}`}
            >
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{contact.displayName}</p>
                  <p className="text-sm text-muted-foreground">
                    {[contact.email, contact.phone].filter(Boolean).join(" · ") ||
                      "No contact info"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
