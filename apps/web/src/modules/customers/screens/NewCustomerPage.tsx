import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError } from "@corely/api-client";
import { CustomerCreationGuidanceSlot } from "@corely/customers-ui";
import { useOptionalWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { customerCreationGuidance } from "../customer-ui-extensions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@corely/ui";
import { Button, Input, Label } from "@corely/ui";
import { customersApi } from "@/lib/customers-api";
import { toast } from "sonner";
import {
  customerFormSchema,
  toCreateCustomerInput,
  getDefaultCustomerFormValues,
  type CustomerFormData,
} from "../schemas/customer-form.schema";
import CustomerFormFields from "../components/CustomerFormFields";
import { CustomAttributesSection, type CustomAttributesValue } from "@/shared/custom-attributes";

export default function NewCustomerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const workspaceId = useOptionalWorkspace()?.activeWorkspace?.id;
  const [customAttributes, setCustomAttributes] = React.useState<CustomAttributesValue | undefined>(
    undefined
  );

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: getDefaultCustomerFormValues(),
  });

  const kind = form.watch("kind");

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const input = {
        ...toCreateCustomerInput(data),
        customFieldValues: customAttributes?.customFieldValues,
        dimensionAssignments: customAttributes?.dimensionAssignments,
      };
      return customersApi.createCustomer(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer created successfully!");
      navigate("/customers");
    },
    onError: (error) => {
      console.error("Error creating customer:", error);
      toast.error(
        error instanceof ApiError && error.code === "Customers:CreationPolicyRejected"
          ? error.detail
          : "Failed to create customer. Please try again."
      );
    },
  });

  const onSubmit = async (data: CustomerFormData) => {
    createCustomerMutation.mutate(data);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/customers")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">Create New Customer</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/customers")}
            disabled={createCustomerMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            disabled={createCustomerMutation.isPending}
            data-testid="submit-customer-button"
          >
            {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} data-testid="customer-form">
        <Card>
          <CardContent className="p-8">
            <CustomerFormFields
              form={form}
              afterDisplayName={
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="customerKind">
                      {t("customers.kindLabel", "Customer type")}
                    </Label>
                    <select
                      id="customerKind"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      {...form.register("kind")}
                    >
                      <option value="INDIVIDUAL">
                        {t("customers.kindIndividual", "Individual")}
                      </option>
                      <option value="ORGANIZATION">
                        {t("customers.kindOrganization", "Organization")}
                      </option>
                    </select>
                  </div>
                  {kind === "ORGANIZATION" && (
                    <div>
                      <Label htmlFor="organizationName">
                        {t("customers.organizationName", "Organization name")}
                      </Label>
                      <Input id="organizationName" {...form.register("organizationName")} />
                    </div>
                  )}
                  <CustomerCreationGuidanceSlot
                    workspaceId={workspaceId}
                    kind={kind}
                    guidance={customerCreationGuidance}
                  />
                </div>
              }
            />
          </CardContent>
        </Card>
      </form>

      <CustomAttributesSection entityType="party" mode="edit" onChange={setCustomAttributes} />
    </div>
  );
}
