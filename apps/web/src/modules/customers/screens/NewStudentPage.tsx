import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, Button } from "@corely/ui";
import { customersApi } from "@/lib/customers-api";
import { toast } from "sonner";
import { withWorkspace } from "@/shared/workspaces/workspace-query-keys";
import {
  customerFormSchema,
  toCreateCustomerInput,
  getDefaultCustomerFormValues,
  type CustomerFormData,
} from "../schemas/customer-form.schema";
import CustomerFormFields from "../components/CustomerFormFields";
import StudentGuardiansPanel from "../components/StudentGuardiansPanel";
import { CustomAttributesSection, type CustomAttributesValue } from "@/shared/custom-attributes";

export default function NewStudentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [createdStudentId, setCreatedStudentId] = React.useState<string | null>(null);
  const [customAttributes, setCustomAttributes] = React.useState<CustomAttributesValue | undefined>(
    undefined
  );

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: getDefaultCustomerFormValues(),
  });

  const createStudentMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const input = {
        ...toCreateCustomerInput(data),
        role: "STUDENT" as const,
        customFieldValues: customAttributes?.customFieldValues,
        dimensionAssignments: customAttributes?.dimensionAssignments,
      };
      return customersApi.createCustomer(input);
    },
    onSuccess: async (student) => {
      await queryClient.invalidateQueries({ queryKey: withWorkspace(["students"]) });
      await queryClient.invalidateQueries({ queryKey: withWorkspace(["customers"]) });
      setCreatedStudentId(student.id);
      toast.success(t("classes.students.createSuccess"));
    },
    onError: (error) => {
      console.error("Error creating student:", error);
      toast.error(t("classes.students.createFailed"));
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    createStudentMutation.mutate(data);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/students")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">{t("classes.students.createTitle")}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/students")}
            disabled={createStudentMutation.isPending}
          >
            {createdStudentId ? t("common.done") : t("common.cancel")}
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            disabled={createStudentMutation.isPending || Boolean(createdStudentId)}
          >
            {createStudentMutation.isPending
              ? t("classes.students.creating")
              : createdStudentId
                ? t("classes.students.created")
                : t("classes.students.createTitle")}
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="p-8">
            <CustomerFormFields
              form={form}
              afterDisplayName={
                createdStudentId ? (
                  <StudentGuardiansPanel studentId={createdStudentId} />
                ) : (
                  <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
                    {t("classes.students.createFirstTip")}
                  </div>
                )
              }
            />
          </CardContent>
        </Card>
      </form>

      <CustomAttributesSection
        entityType="party"
        entityId={createdStudentId ?? undefined}
        mode="edit"
        onChange={setCustomAttributes}
      />
    </div>
  );
}
