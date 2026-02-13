import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@corely/ui";
import { CrudListPageLayout, ConfirmDeleteDialog } from "@/shared/crud";
import { customAttributesApi } from "@/lib/custom-attributes-api";

const SUPPORTED_ENTITY_TYPES = ["expense", "party"] as const;
type SupportedEntityType = (typeof SUPPORTED_ENTITY_TYPES)[number];

const SUPPORTED_FIELD_TYPES = [
  "TEXT",
  "NUMBER",
  "DATE",
  "BOOLEAN",
  "SELECT",
  "MULTI_SELECT",
  "MONEY",
] as const;
type SupportedFieldType = (typeof SUPPORTED_FIELD_TYPES)[number];

type FormState = {
  id?: string;
  key: string;
  label: string;
  type: SupportedFieldType;
  required: boolean;
  isIndexed: boolean;
  optionsRaw: string;
};

export default function CustomFieldsSettingsPage() {
  const queryClient = useQueryClient();
  const [entityType, setEntityType] = React.useState<SupportedEntityType>("expense");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<FormState | null>(null);

  const { data: definitions = [], isLoading } = useQuery({
    queryKey: ["custom-fields-settings", entityType],
    queryFn: () => customAttributesApi.listCustomFieldDefinitions(entityType),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: FormState) => {
      const options = payload.optionsRaw
        ? payload.optionsRaw
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : undefined;

      if (payload.id) {
        return customAttributesApi.updateCustomFieldDefinition(payload.id, {
          label: payload.label,
          required: payload.required,
          isIndexed: payload.isIndexed,
          ...(options ? { options } : {}),
        });
      }

      return customAttributesApi.createCustomFieldDefinition({
        tenantId: "",
        entityType,
        key: payload.key,
        label: payload.label,
        type: payload.type,
        required: payload.required,
        isIndexed: payload.isIndexed,
        ...(options ? { options } : {}),
      });
    },
    onSuccess: async () => {
      setDialogOpen(false);
      setFormState(null);
      await queryClient.invalidateQueries({ queryKey: ["custom-fields-settings", entityType] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => customAttributesApi.deleteCustomFieldDefinition(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["custom-fields-settings", entityType] });
    },
  });

  const openCreateDialog = () => {
    setFormState({
      key: "",
      label: "",
      type: "TEXT",
      required: false,
      isIndexed: false,
      optionsRaw: "",
    });
    setDialogOpen(true);
  };

  const onEntityTypeChange = (value: string) => {
    if (SUPPORTED_ENTITY_TYPES.includes(value as SupportedEntityType)) {
      setEntityType(value as SupportedEntityType);
    }
  };

  const onFieldTypeChange = (value: string) => {
    if (SUPPORTED_FIELD_TYPES.includes(value as SupportedFieldType) && formState) {
      setFormState({ ...formState, type: value as SupportedFieldType });
    }
  };

  return (
    <>
      <CrudListPageLayout
        title="Custom Fields"
        subtitle="Manage custom field definitions and indexing"
        primaryAction={
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New field
          </Button>
        }
      >
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Label>Entity type</Label>
              <Select value={entityType} onValueChange={onEntityTypeChange}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="party">Party</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading custom fields...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 text-left">Label</th>
                      <th className="py-2 text-left">Key</th>
                      <th className="py-2 text-left">Type</th>
                      <th className="py-2 text-left">Required</th>
                      <th className="py-2 text-left">Indexed</th>
                      <th className="py-2 text-left">Status</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {definitions.map((definition) => (
                      <tr key={definition.id} className="border-b border-border/60">
                        <td className="py-2">{definition.label}</td>
                        <td className="py-2 font-mono text-xs">{definition.key}</td>
                        <td className="py-2">{definition.type}</td>
                        <td className="py-2">{definition.required ? "Yes" : "No"}</td>
                        <td className="py-2">{definition.isIndexed ? "Yes" : "No"}</td>
                        <td className="py-2">{definition.isActive ? "Active" : "Archived"}</td>
                        <td className="py-2">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setFormState({
                                  id: definition.id,
                                  key: definition.key,
                                  label: definition.label,
                                  type: definition.type,
                                  required: definition.required,
                                  isIndexed: definition.isIndexed,
                                  optionsRaw: Array.isArray(definition.options)
                                    ? definition.options.join(",")
                                    : "",
                                });
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <ConfirmDeleteDialog
                              trigger={
                                <Button size="sm" variant="destructive">
                                  Archive
                                </Button>
                              }
                              title="Archive custom field"
                              description="This field will be hidden from forms."
                              onConfirm={() => archiveMutation.mutate(definition.id)}
                              isLoading={archiveMutation.isPending}
                            />
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
      </CrudListPageLayout>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formState?.id ? "Edit custom field" : "Create custom field"}</DialogTitle>
          </DialogHeader>
          {formState ? (
            <div className="space-y-3">
              <div>
                <Label>Key</Label>
                <Input
                  value={formState.key}
                  onChange={(event) => setFormState({ ...formState, key: event.target.value })}
                  disabled={Boolean(formState.id)}
                />
              </div>
              <div>
                <Label>Label</Label>
                <Input
                  value={formState.label}
                  onChange={(event) => setFormState({ ...formState, label: event.target.value })}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={formState.type}
                  onValueChange={onFieldTypeChange}
                  disabled={Boolean(formState.id)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEXT">TEXT</SelectItem>
                    <SelectItem value="NUMBER">NUMBER</SelectItem>
                    <SelectItem value="DATE">DATE</SelectItem>
                    <SelectItem value="BOOLEAN">BOOLEAN</SelectItem>
                    <SelectItem value="SELECT">SELECT</SelectItem>
                    <SelectItem value="MULTI_SELECT">MULTI_SELECT</SelectItem>
                    <SelectItem value="MONEY">MONEY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Options (comma-separated, for select types)</Label>
                <Input
                  value={formState.optionsRaw}
                  onChange={(event) =>
                    setFormState({
                      ...formState,
                      optionsRaw: event.target.value,
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="required"
                  type="checkbox"
                  checked={formState.required}
                  onChange={(event) =>
                    setFormState({
                      ...formState,
                      required: event.target.checked,
                    })
                  }
                />
                <Label htmlFor="required">Required</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="indexed"
                  type="checkbox"
                  checked={formState.isIndexed}
                  onChange={(event) =>
                    setFormState({
                      ...formState,
                      isIndexed: event.target.checked,
                    })
                  }
                />
                <Label htmlFor="indexed">Indexed for filtering</Label>
              </div>
              <Button
                className="w-full"
                onClick={() => saveMutation.mutate(formState)}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
