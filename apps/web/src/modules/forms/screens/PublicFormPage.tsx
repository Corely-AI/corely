import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { Checkbox } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { formsApi } from "@/lib/forms-api";
import type { PublicFormFieldDto } from "@corely/contracts";

export default function PublicFormPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const [token, setToken] = useState("");
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  const {
    data: form,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-form", publicId],
    queryFn: () => (publicId ? formsApi.getPublicForm(publicId) : Promise.reject()),
    enabled: Boolean(publicId),
  });

  const submitMutation = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      formsApi.submitPublicForm(publicId as string, { token, payload }),
    onSuccess: () => {
      toast.success("Submission received");
      setSubmitted(true);
    },
    onError: () => toast.error("Failed to submit form"),
  });

  const orderedFields = useMemo(() => {
    return (form?.fields ?? []).slice().sort((a, b) => a.order - b.order);
  }, [form?.fields]);

  const buildPayload = () => {
    const payload: Record<string, any> = {};
    orderedFields.forEach((field) => {
      const value = values[field.key];
      if (value === undefined || value === "") {
        return;
      }
      switch (field.type) {
        case "NUMBER":
          payload[field.key] = Number(value);
          return;
        case "BOOLEAN":
          payload[field.key] = Boolean(value);
          return;
        default:
          payload[field.key] = value;
      }
    });
    return payload;
  };

  const toggleMultiSelect = (field: PublicFormFieldDto, option: string, checked: boolean) => {
    const current = Array.isArray(values[field.key]) ? values[field.key] : [];
    const next = checked ? [...current, option] : current.filter((item: string) => item !== option);
    setValues({ ...values, [field.key]: next });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 animate-pulse rounded-full bg-muted/20" />
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="p-6 text-center text-muted-foreground">
            Form not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Thank you!</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Your submission has been received.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 flex items-start justify-center p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle>{form.name}</CardTitle>
          {form.description ? (
            <p className="text-sm text-muted-foreground">{form.description}</p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Access token</Label>
            <Input value={token} onChange={(event) => setToken(event.target.value)} />
          </div>

          {orderedFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label>
                {field.label} {field.required ? "*" : ""}
              </Label>
              {field.type === "LONG_TEXT" ? (
                <Textarea
                  rows={3}
                  value={values[field.key] ?? ""}
                  onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
                />
              ) : field.type === "BOOLEAN" ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={Boolean(values[field.key])}
                    onCheckedChange={(checked) =>
                      setValues({ ...values, [field.key]: Boolean(checked) })
                    }
                  />
                  <span className="text-sm text-muted-foreground">Yes</span>
                </div>
              ) : field.type === "SINGLE_SELECT" ? (
                <Select
                  value={values[field.key] ?? ""}
                  onValueChange={(value) => setValues({ ...values, [field.key]: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.configJson?.options as string[] | undefined)?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "MULTI_SELECT" ? (
                <div className="space-y-2">
                  {(field.configJson?.options as string[] | undefined)?.map((option) => (
                    <div key={option} className="flex items-center gap-2">
                      <Checkbox
                        checked={
                          Array.isArray(values[field.key]) && values[field.key].includes(option)
                        }
                        onCheckedChange={(checked) =>
                          toggleMultiSelect(field, option, Boolean(checked))
                        }
                      />
                      <span className="text-sm text-muted-foreground">{option}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <Input
                  type={
                    field.type === "NUMBER"
                      ? "number"
                      : field.type === "DATE"
                        ? "date"
                        : field.type === "EMAIL"
                          ? "email"
                          : "text"
                  }
                  value={values[field.key] ?? ""}
                  onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
                />
              )}
              {field.helpText ? (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              ) : null}
            </div>
          ))}

          <Button
            variant="accent"
            onClick={() => submitMutation.mutate(buildPayload())}
            disabled={submitMutation.isPending || !token}
          >
            {submitMutation.isPending ? "Submitting..." : "Submit"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
