import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, User, Building, Mail, Phone, Calendar } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Badge,
  Separator,
} from "@corely/ui";
import { crmApi } from "@corely/web-shared/lib/crm-api";
import { toast } from "sonner";
import { SequenceEnrollmentCard } from "../components/SequenceEnrollmentCard";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isConverting, setIsConverting] = useState(false);

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => crmApi.getLead(id!),
    enabled: !!id,
  });

  const convertMutation = useMutation({
    mutationFn: () =>
      crmApi.convertLead({
        leadId: id!,
        dealTitle: lead?.companyName ? `${lead.companyName} Deal` : undefined,
      }),
    onSuccess: (data) => {
      toast.success("Lead converted successfully!");
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
      // Redirect to the new deal
      if (data.deal) {
        navigate(`/crm/deals/${data.deal.id}`);
      }
    },
    onError: (error) => {
      toast.error("Failed to convert lead");
      console.error(error);
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (!lead) {
    return <div>Lead not found</div>;
  }

  const handleConvert = () => {
    if (
      confirm(
        "Are you sure you want to convert this lead? This will create a Contact, Company (if applicable), and Deal."
      )
    ) {
      convertMutation.mutate();
    }
  };

  return (
    <div
      className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-4xl mx-auto"
      data-testid="crm-lead-detail-page"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-bold mb-1">
            {lead.companyName || `${lead.firstName || ""} ${lead.lastName || ""}`}
          </h1>
          <div className="flex items-center gap-2">
            <Badge
              variant={lead.status === "CONVERTED" ? "success" : "secondary"}
              data-testid="crm-lead-status"
            >
              {lead.status}
            </Badge>
            <span className="text-sm text-muted-foreground">{lead.source}</span>
          </div>
        </div>

        {lead.status !== "CONVERTED" && (
          <Button
            onClick={handleConvert}
            disabled={convertMutation.isPending}
            data-testid="crm-lead-convert"
          >
            {convertMutation.isPending ? "Converting..." : "Convert to Deal"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.notes && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Notes</h4>
                  <p className="whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Source</h4>
                  <p>{lead.source}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Created At</h4>
                  <p>{new Date(lead.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <SequenceEnrollmentCard entityType="lead" entityId={lead.id} />
          <Card>
            <CardHeader>
              <CardTitle>Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.firstName && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {lead.firstName} {lead.lastName}
                  </span>
                </div>
              )}
              {lead.companyName && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.companyName}</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${lead.email}`} className="hover:underline">
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${lead.phone}`} className="hover:underline">
                    {lead.phone}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
