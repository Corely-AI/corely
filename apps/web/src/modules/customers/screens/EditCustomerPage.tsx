import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { customersApi } from "@/lib/customers-api";
import { toast } from "sonner";
import {
  customerFormSchema,
  toUpdateCustomerInput,
  toCustomerFormValues,
  getDefaultCustomerFormValues,
  type CustomerFormData,
} from "../schemas/customer-form.schema";
import CustomerFormFields from "../components/CustomerFormFields";
import { CustomAttributesSection, type CustomAttributesValue } from "@/shared/custom-attributes";
import CustomerLoyaltySection from "../components/CustomerLoyaltySection";
import CustomerPackagesSection from "../components/CustomerPackagesSection";

export default function EditCustomerPage() {
  const uiCopy = useUiCopy("ui.customers-editcustomerpage");
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const customerId = id ?? "";
  const queryClient = useQueryClient();
  const [customAttributes, setCustomAttributes] = React.useState<CustomAttributesValue | undefined>(
    undefined
  );

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customers", customerId],
    queryFn: () => customersApi.getCustomer(customerId),
    enabled: Boolean(customerId),
  });

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: getDefaultCustomerFormValues(),
    values: customer ? toCustomerFormValues(customer) : undefined,
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const patch = {
        ...toUpdateCustomerInput(data),
        ...(customAttributes
          ? {
              customFieldValues: customAttributes.customFieldValues,
              dimensionAssignments: customAttributes.dimensionAssignments,
            }
          : {}),
      };
      return customersApi.updateCustomer(customerId, patch);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      void queryClient.invalidateQueries({ queryKey: ["customers", customerId] });
      toast.success(uiCopy("customer-updated-successfully"));
      navigate("/customers");
    },
    onError: (error) => {
      console.error("Error updating customer:", error);
      toast.error(uiCopy("failed-to-update-customer"));
    },
  });

  const onSubmit = async (data: CustomerFormData) => {
    updateCustomerMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="text-center">{uiCopy("loading-customer")}</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="text-center">{uiCopy("customer-not-found")}</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/customers")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">{uiCopy("edit-customer")}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/customers/birthdays")}>
            {uiCopy("birthday-reminders")}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/customers")}
            disabled={updateCustomerMutation.isPending}
          >
            {uiCopy("cancel")}
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            disabled={updateCustomerMutation.isPending}
            data-testid="submit-customer-button"
          >
            {updateCustomerMutation.isPending ? uiCopy("saving") : uiCopy("save-changes")}
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} data-testid="customer-form">
        <Card>
          <CardContent className="p-8">
            <CustomerFormFields form={form} />
          </CardContent>
        </Card>
      </form>

      <CustomAttributesSection
        entityType="party"
        entityId={customerId}
        mode="edit"
        onChange={setCustomAttributes}
      />

      <CustomerLoyaltySection customerId={customerId} />
      <CustomerPackagesSection customerId={customerId} />
    </div>
  );
}
