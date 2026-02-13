import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardContent } from "@corely/ui";
import { toast } from "sonner";
import { customersApi } from "@/lib/customers-api";
import { withWorkspace } from "@/shared/workspaces/workspace-query-keys";
import {
  customerFormSchema,
  getDefaultCustomerFormValues,
  toCustomerFormValues,
  toUpdateCustomerInput,
  type CustomerFormData,
} from "../schemas/customer-form.schema";
import CustomerFormFields from "../components/CustomerFormFields";

export default function EditSupplierPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: supplier, isLoading } = useQuery({
    queryKey: withWorkspace(["suppliers", "detail", id]),
    queryFn: () => customersApi.getCustomer(id!, "SUPPLIER"),
    enabled: !!id,
  });

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: getDefaultCustomerFormValues(),
    values: supplier ? toCustomerFormValues(supplier) : undefined,
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const patch = toUpdateCustomerInput(data);
      return customersApi.updateCustomer(id!, patch, "SUPPLIER");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: withWorkspace(["suppliers"]) });
      toast.success("Supplier updated");
      navigate("/suppliers");
    },
    onError: () => {
      toast.error("Failed to update supplier. Please try again.");
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    updateSupplierMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground">Loading supplier...</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground">Supplier not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/suppliers")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">Edit Supplier</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/suppliers")}
            disabled={updateSupplierMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            disabled={updateSupplierMutation.isPending}
          >
            {updateSupplierMutation.isPending ? "Saving..." : "Save Changes"}
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
