import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Edit } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { customersApi } from "@/lib/customers-api";

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contact } = useQuery({
    queryKey: ["crm-contact", id],
    queryFn: () => customersApi.getCustomer(id!, "CONTACT"),
    enabled: Boolean(id),
  });

  if (!contact) {
    return <div className="p-6 lg:p-8">Contact not found</div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="crm-contact-detail">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/crm/contacts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-h1 text-foreground" data-testid="crm-contact-detail-name">
            {contact.displayName}
          </h1>
          <p className="text-sm text-muted-foreground">Contact</p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/crm/contacts/${contact.id}/edit`)}
          data-testid="crm-contact-edit"
        >
          <Edit className="h-4 w-4" />
          Edit
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p data-testid="crm-contact-detail-email">{contact.email || "-"}</p>
          <p data-testid="crm-contact-detail-phone">{contact.phone || "-"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
