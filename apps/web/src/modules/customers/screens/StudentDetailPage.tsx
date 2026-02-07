import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, Button } from "@corely/ui";
import { customersApi } from "@/lib/customers-api";
import {
  customerFormSchema,
  toUpdateCustomerInput,
  toCustomerFormValues,
  getDefaultCustomerFormValues,
  type CustomerFormData,
} from "../schemas/customer-form.schema";
import CustomerFormFields from "../components/CustomerFormFields";
import StudentGuardiansPanel from "../components/StudentGuardiansPanel";
import { withWorkspace } from "@/shared/workspaces/workspace-query-keys";

export default function StudentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const studentId = id ?? "";
  const queryClient = useQueryClient();

  const studentKey = withWorkspace(["students", "detail", studentId]);
  const listKey = withWorkspace(["students", "list"]);

  const { data: student, isLoading } = useQuery({
    queryKey: studentKey,
    queryFn: () => customersApi.getCustomer(studentId, "STUDENT"),
    enabled: Boolean(studentId),
  });

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: getDefaultCustomerFormValues(),
    values: student ? toCustomerFormValues(student) : undefined,
  });

  const updateStudentMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const patch = toUpdateCustomerInput(data);
      return customersApi.updateCustomer(studentId, patch, "STUDENT");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: studentKey });
      await queryClient.invalidateQueries({ queryKey: listKey });
      await queryClient.invalidateQueries({ queryKey: withWorkspace(["customers"]) });
      navigate("/students");
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    updateStudentMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="text-center">Loading student...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="text-center">Student not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/students")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">Student</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/students")}
            disabled={updateStudentMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            disabled={updateStudentMutation.isPending}
          >
            {updateStudentMutation.isPending ? "Saving..." : "Save Changes"}
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

      <StudentGuardiansPanel studentId={studentId} />
    </div>
  );
}
