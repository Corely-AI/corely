import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Edit, Mail, Phone, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Button } from "@corely/ui";
import { crmApi } from "@corely/web-shared/lib/crm-api";
import { CustomAttributesSection } from "@corely/web-shared/shared/custom-attributes";

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: account, isLoading } = useQuery({
    queryKey: ["account", id],
    queryFn: () => crmApi.getAccount(id!),
    enabled: !!id,
  });
  const { data: customAttributes } = useQuery({
    queryKey: ["account", id, "custom-attributes"],
    queryFn: () => crmApi.getAccountCustomAttributes(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 animate-pulse" data-testid="crm-account-detail-loading">
        <div className="h-8 w-64 bg-muted rounded" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground">Account not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="crm-account-detail">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/crm/accounts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-h1 text-foreground" data-testid="crm-account-detail-name">
            {account.name}
          </h1>
          <p className="text-sm text-muted-foreground">Account · {account.accountType}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/crm/accounts/${id}/edit`)}
          data-testid="crm-account-edit"
        >
          <Edit className="h-4 w-4" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identity Section (Party data) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {account.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span data-testid="crm-account-email">{account.email}</span>
              </div>
            )}
            {account.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span data-testid="crm-account-phone">{account.phone}</span>
              </div>
            )}
            {account.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a
                  href={account.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {account.website}
                </a>
              </div>
            )}
            {!account.email && !account.phone && !account.website && (
              <p className="text-sm text-muted-foreground">No contact information</p>
            )}
          </CardContent>
        </Card>

        {/* CRM Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>CRM Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  account.status === "ACTIVE"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : account.status === "PROSPECT"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                }`}
                data-testid="crm-account-status"
              >
                {account.status}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Type</span>
              <span data-testid="crm-account-type">{account.accountType}</span>
            </div>
            {account.industry && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Industry</span>
                <span>{account.industry}</span>
              </div>
            )}
            {account.notes && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{account.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div data-testid="crm-account-custom-fields">
        <CustomAttributesSection
          entityType="party"
          mode="read"
          value={
            customAttributes
              ? {
                  customFieldValues: customAttributes.customFieldValues,
                  dimensionAssignments: customAttributes.dimensionAssignments,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
