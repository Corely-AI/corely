import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@corely/ui";
import { Card, CardContent } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { formsApi } from "@/lib/forms-api";
import {
  formCreateSchema,
  getDefaultFormValues,
  type FormCreateValues,
} from "../schemas/form-create.schema";

export default function NewFormPage() {
  const navigate = useNavigate();
  const form = useForm<FormCreateValues>({
    resolver: zodResolver(formCreateSchema),
    defaultValues: getDefaultFormValues(),
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormCreateValues) => formsApi.createForm(data),
    onSuccess: (created) => {
      toast.success("Form created");
      navigate(`/forms/${created.id}`);
    },
    onError: () => toast.error("Failed to create form"),
  });

  const onSubmit = (data: FormCreateValues) => {
    createMutation.mutate(data);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/forms")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">Create new form</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/forms")}>
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create form"}
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="p-8 space-y-6">
            <div>
              <Label htmlFor="name">Form name</Label>
              <Input id="name" {...form.register("name")} placeholder="Contact us" />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                {...form.register("description")}
                placeholder="Tell respondents what this form is for"
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
