import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ClipboardCopy,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Badge } from "@/shared/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/shared/ui/drawer";
import { formsApi, buildFormPublicLink } from "@/lib/forms-api";
import { formKeys } from "../queries";
import type {
  AddFieldInput,
  FormFieldDto,
  FormSubmissionDto,
  FormFieldType,
} from "@corely/contracts";
import { formatDate } from "@/shared/lib/formatters";

const FIELD_TYPES: { label: string; value: FormFieldType }[] = [
  { label: "Short text", value: "SHORT_TEXT" },
  { label: "Long text", value: "LONG_TEXT" },
  { label: "Number", value: "NUMBER" },
  { label: "Date", value: "DATE" },
  { label: "Boolean", value: "BOOLEAN" },
  { label: "Single select", value: "SINGLE_SELECT" },
  { label: "Multi select", value: "MULTI_SELECT" },
  { label: "Email", value: "EMAIL" },
];

const EMPTY_FIELD: AddFieldInput = {
  label: "",
  type: "SHORT_TEXT",
  required: false,
  helpText: "",
  config: undefined,
};

export default function FormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [fieldDraft, setFieldDraft] = useState<AddFieldInput>(EMPTY_FIELD);
  const [editingField, setEditingField] = useState<FormFieldDto | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [submissionDetail, setSubmissionDetail] = useState<FormSubmissionDto | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const tab = searchParams.get("tab") ?? "builder";

  const {
    data: form,
    isLoading,
    isError,
  } = useQuery({
    queryKey: formKeys.detail(id),
    queryFn: () => (id ? formsApi.getForm(id) : Promise.reject(new Error("Missing id"))),
    enabled: Boolean(id),
  });

  const { data: submissions } = useQuery({
    queryKey: ["forms", "submissions", id],
    queryFn: () =>
      id ? formsApi.listSubmissions(id, { page: 1, pageSize: 50 }) : Promise.resolve(undefined),
    enabled: Boolean(id) && tab === "submissions",
  });

  const updateFormMutation = useMutation({
    mutationFn: (data: { name: string; description?: string | null }) =>
      formsApi.updateForm(id as string, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(formKeys.detail(id), updated);
      toast.success("Form updated");
    },
    onError: () => toast.error("Failed to update form"),
  });

  const addFieldMutation = useMutation({
    mutationFn: (payload: AddFieldInput) => formsApi.addField(id as string, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(formKeys.detail(id), updated);
      toast.success("Field added");
    },
    onError: () => toast.error("Failed to add field"),
  });

  const updateFieldMutation = useMutation({
    mutationFn: (payload: { fieldId: string; data: Partial<AddFieldInput> }) =>
      formsApi.updateField(id as string, payload.fieldId, payload.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(formKeys.detail(id), updated);
      toast.success("Field updated");
    },
    onError: () => toast.error("Failed to update field"),
  });

  const removeFieldMutation = useMutation({
    mutationFn: (fieldId: string) => formsApi.removeField(id as string, fieldId),
    onSuccess: (updated) => {
      queryClient.setQueryData(formKeys.detail(id), updated);
      toast.success("Field removed");
    },
    onError: () => toast.error("Failed to remove field"),
  });

  const reorderFieldsMutation = useMutation({
    mutationFn: (fieldIds: string[]) => formsApi.reorderFields(id as string, fieldIds),
    onSuccess: (updated) => {
      queryClient.setQueryData(formKeys.detail(id), updated);
    },
  });

  const publishMutation = useMutation({
    mutationFn: (regenerate?: boolean) =>
      formsApi.publishForm(id as string, regenerate ? { regenerateToken: true } : {}),
    onSuccess: (result) => {
      setShareToken(result.token);
      toast.success("Form published");
      void queryClient.invalidateQueries({ queryKey: formKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: formKeys.list(undefined) });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to publish form";
      toast.error(message);
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => formsApi.unpublishForm(id as string),
    onSuccess: (updated) => {
      queryClient.setQueryData(formKeys.detail(id), updated);
      setShareToken(null);
      toast.success("Form unpublished");
    },
    onError: () => toast.error("Failed to unpublish form"),
  });

  useEffect(() => {
    if (form) {
      setFieldDraft(EMPTY_FIELD);
      setFormName(form.name);
      setFormDescription(form.description ?? "");
    }
  }, [form]);

  const orderedFields = useMemo(() => {
    return (form?.fields ?? []).slice().sort((a, b) => a.order - b.order);
  }, [form?.fields]);

  const publicUrl = form?.publicId
    ? `${window.location.origin}${buildFormPublicLink(form.publicId)}`
    : "";

  const openAddField = () => {
    setEditingField(null);
    setFieldDraft({ ...EMPTY_FIELD });
    setFieldDialogOpen(true);
  };

  const openEditField = (field: FormFieldDto) => {
    setEditingField(field);
    setFieldDraft({
      label: field.label,
      type: field.type,
      required: field.required,
      helpText: field.helpText ?? "",
      config:
        field.type === "SINGLE_SELECT" || field.type === "MULTI_SELECT"
          ? { options: (field.configJson?.options as string[]) ?? [] }
          : (field.configJson ?? undefined),
    });
    setFieldDialogOpen(true);
  };

  const handleSaveField = () => {
    if (!fieldDraft.label) {
      toast.error("Field label is required");
      return;
    }
    const payload: AddFieldInput = {
      label: fieldDraft.label,
      type: fieldDraft.type,
      required: fieldDraft.required ?? false,
      helpText: fieldDraft.helpText,
      config: fieldDraft.config,
    };

    if (editingField) {
      updateFieldMutation.mutate({ fieldId: editingField.id, data: payload });
    } else {
      addFieldMutation.mutate(payload);
    }
    setFieldDialogOpen(false);
  };

  const handleReorder = (fieldId: string, direction: "up" | "down") => {
    if (!orderedFields.length) {
      return;
    }
    const idx = orderedFields.findIndex((field) => field.id === fieldId);
    if (idx === -1) {
      return;
    }
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= orderedFields.length) {
      return;
    }
    const next = orderedFields.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    reorderFieldsMutation.mutate(next.map((field) => field.id));
  };

  const submissionRows = submissions?.items ?? [];

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted/20" />
        <div className="h-40 w-full animate-pulse rounded bg-muted/20" />
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Button variant="ghost" onClick={() => navigate("/forms")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to forms
        </Button>
        <Card>
          <CardContent className="p-6">Form not found.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/forms")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-h1 text-foreground">{form.name}</h1>
          <p className="text-sm text-muted-foreground">Form builder and submissions</p>
        </div>
        <Badge variant={form.status === "PUBLISHED" ? "success" : "muted"}>
          {form.status === "PUBLISHED" ? "Published" : "Draft"}
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={(value) => setSearchParams({ tab: value })}>
        <TabsList>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="share">Share</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Form details</CardTitle>
                <Button
                  variant="outline"
                  onClick={() =>
                    updateFormMutation.mutate({
                      name: formName,
                      description: formDescription || null,
                    })
                  }
                  disabled={updateFormMutation.isPending}
                >
                  {updateFormMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="form-name">Name</Label>
                  <Input
                    id="form-name"
                    value={formName}
                    onChange={(event) => setFormName(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="form-description">Description</Label>
                  <Textarea
                    id="form-description"
                    rows={2}
                    value={formDescription}
                    onChange={(event) => setFormDescription(event.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Fields</CardTitle>
              <Button variant="accent" onClick={openAddField}>
                <Plus className="h-4 w-4" />
                Add field
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {orderedFields.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  Add fields to start building your form.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Label
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Required
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Order
                        </th>
                        <th className="w-[120px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedFields.map((field, index) => (
                        <tr key={field.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 text-sm font-medium">{field.label}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={field.required ? "success" : "muted"}>
                              {field.required ? "Yes" : "No"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleReorder(field.id, "up")}
                                disabled={index === 0}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleReorder(field.id, "down")}
                                disabled={index === orderedFields.length - 1}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditField(field)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFieldMutation.mutate(field.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="share" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                {form.status === "PUBLISHED" ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => publishMutation.mutate(true)}
                      disabled={publishMutation.isPending}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Regenerate token
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => unpublishMutation.mutate()}
                      disabled={unpublishMutation.isPending}
                    >
                      Unpublish
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="accent"
                    onClick={() => publishMutation.mutate(false)}
                    disabled={publishMutation.isPending}
                  >
                    Publish form
                  </Button>
                )}
                <p className="text-sm text-muted-foreground">
                  Publishing generates a public link and access token for submissions.
                </p>
              </div>

              {form.status === "PUBLISHED" && form.publicId ? (
                <div className="space-y-3">
                  <div>
                    <Label>Public URL</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input value={publicUrl} readOnly />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          void navigator.clipboard.writeText(publicUrl);
                          toast.success("Link copied");
                        }}
                      >
                        <ClipboardCopy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Access token (shown once)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input value={shareToken ?? "Regenerate to view"} readOnly />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (shareToken) {
                            void navigator.clipboard.writeText(shareToken);
                            toast.success("Token copied");
                          }
                        }}
                        disabled={!shareToken}
                      >
                        <ClipboardCopy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submissions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {submissionRows.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No submissions yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Submitted
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Source
                        </th>
                        <th className="w-[120px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissionRows.map((submission) => (
                        <tr key={submission.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 text-sm">
                            {formatDate(submission.submittedAt, "en-US")}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {submission.source}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSubmissionDetail(submission)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? "Edit field" : "Add field"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Label</Label>
              <Input
                value={fieldDraft.label}
                onChange={(event) => setFieldDraft({ ...fieldDraft, label: event.target.value })}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={fieldDraft.type}
                onValueChange={(value: FormFieldType) =>
                  setFieldDraft({ ...fieldDraft, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(fieldDraft.type === "SINGLE_SELECT" || fieldDraft.type === "MULTI_SELECT") && (
              <div>
                <Label>Options (comma separated)</Label>
                <Input
                  value={((fieldDraft.config as any)?.options ?? []).join(", ")}
                  onChange={(event) =>
                    setFieldDraft({
                      ...fieldDraft,
                      config: {
                        options: event.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>Required</Label>
              <Switch
                checked={fieldDraft.required ?? false}
                onCheckedChange={(checked) =>
                  setFieldDraft({ ...fieldDraft, required: Boolean(checked) })
                }
              />
            </div>
            <div>
              <Label>Help text</Label>
              <Textarea
                rows={2}
                value={fieldDraft.helpText ?? ""}
                onChange={(event) => setFieldDraft({ ...fieldDraft, helpText: event.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="accent" onClick={handleSaveField}>
              Save field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer
        open={Boolean(submissionDetail)}
        onOpenChange={(open) => !open && setSubmissionDetail(null)}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Submission details</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-3">
            {submissionDetail ? (
              (() => {
                const keys =
                  form.fields?.map((field) => field.key) ??
                  Object.keys(submissionDetail.payloadJson);
                const uniqueKeys = Array.from(
                  new Set([...keys, ...Object.keys(submissionDetail.payloadJson)])
                );
                return uniqueKeys.map((key) => {
                  const fieldLabel = form.fields?.find((field) => field.key === key)?.label ?? key;
                  const value = submissionDetail.payloadJson[key];
                  const displayValue = Array.isArray(value)
                    ? value.join(", ")
                    : value === undefined || value === null
                      ? "(not provided)"
                      : typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value);
                  return (
                    <div key={key} className="flex items-start justify-between gap-4">
                      <div className="text-sm font-medium text-muted-foreground">{fieldLabel}</div>
                      <div className="text-sm text-foreground text-right max-w-[60%] break-words">
                        {displayValue}
                      </div>
                    </div>
                  );
                });
              })()
            ) : (
              <div className="text-sm text-muted-foreground">No submission selected.</div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
