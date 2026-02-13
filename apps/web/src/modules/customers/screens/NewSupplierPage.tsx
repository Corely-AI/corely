import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardContent } from "@corely/ui";
import { toast } from "sonner";
import { customersApi } from "@/lib/customers-api";
import { withWorkspace } from "@/shared/workspaces/workspace-query-keys";
import {
  customerFormSchema,
  getDefaultCustomerFormValues,
  toCreateCustomerInput,
  type CustomerFormData,
} from "../schemas/customer-form.schema";
import CustomerFormFields from "../components/CustomerFormFields";

export default function NewSupplierPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: getDefaultCustomerFormValues(),
  });

  const createSupplierMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const input = toCreateCustomerInput(data);
      return customersApi.createCustomer({ ...input, role: "SUPPLIER" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: withWorkspace(["suppliers"]) });
      toast.success("Supplier created");
      navigate("/suppliers");
    },
    onError: () => {
      toast.error("Failed to create supplier. Please try again.");
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    createSupplierMutation.mutate(data);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/suppliers")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">Create Supplier</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/suppliers")}
            disabled={createSupplierMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            disabled={createSupplierMutation.isPending}
          >
            {createSupplierMutation.isPending ? "Creating..." : "Create Supplier"}
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="p-8">
            <CustomerFormFields form={form} />
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
