import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, ListFilter } from "lucide-react";
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
import { customAttributesApi } from "@/lib/custom-attributes-api";
import { CrudListPageLayout, ConfirmDeleteDialog } from "@/shared/crud";

type TypeFormState = {
  id?: string;
  name: string;
  code: string;
  appliesTo: "expense" | "party";
  allowMultiple: boolean;
  required: boolean;
};

type ValueFormState = {
  id?: string;
  name: string;
  code: string;
};

export default function DimensionsSettingsPage() {
  const queryClient = useQueryClient();
  const [typeDialogOpen, setTypeDialogOpen] = React.useState(false);
  const [valueDialogOpen, setValueDialogOpen] = React.useState(false);
  const [editingType, setEditingType] = React.useState<TypeFormState | null>(null);
  const [editingValue, setEditingValue] = React.useState<ValueFormState | null>(null);
  const [selectedTypeId, setSelectedTypeId] = React.useState<string | null>(null);
  const [appliesToFilter, setAppliesToFilter] = React.useState<string>("all");

  const { data: types = [], isLoading } = useQuery({
    queryKey: ["dimensions-settings", appliesToFilter],
    queryFn: () =>
      customAttributesApi.listDimensionTypes(
        appliesToFilter === "all" ? undefined : appliesToFilter
      ),
  });

  const { data: values = [], isLoading: isValuesLoading } = useQuery({
    queryKey: ["dimensions-settings", "values", selectedTypeId],
    queryFn: () => customAttributesApi.listDimensionValues(selectedTypeId!),
    enabled: Boolean(selectedTypeId),
  });

  const saveTypeMutation = useMutation({
    mutationFn: async (payload: TypeFormState) => {
      if (payload.id) {
        return customAttributesApi.updateDimensionType(payload.id, {
          name: payload.name,
          code: payload.code,
          appliesTo: [payload.appliesTo],
          requiredFor: payload.required ? [payload.appliesTo] : [],
          allowMultiple: payload.allowMultiple,
        });
      }

      return customAttributesApi.createDimensionType({
        name: payload.name,
        code: payload.code,
        appliesTo: [payload.appliesTo],
        requiredFor: payload.required ? [payload.appliesTo] : [],
        allowMultiple: payload.allowMultiple,
        isActive: true,
        sortOrder: 0,
      });
    },
    onSuccess: async () => {
      setTypeDialogOpen(false);
      setEditingType(null);
      await queryClient.invalidateQueries({ queryKey: ["dimensions-settings"] });
    },
  });

  const archiveTypeMutation = useMutation({
    mutationFn: (id: string) => customAttributesApi.deleteDimensionType(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dimensions-settings"] });
    },
  });

  const saveValueMutation = useMutation({
    mutationFn: async (payload: ValueFormState) => {
      if (!selectedTypeId) {
        throw new Error("No dimension type selected");
      }
      if (payload.id) {
        return customAttributesApi.updateDimensionValue(payload.id, {
          name: payload.name,
          code: payload.code,
        });
      }
      return customAttributesApi.createDimensionValue(selectedTypeId, {
        name: payload.name,
        code: payload.code,
        isActive: true,
        sortOrder: 0,
      });
    },
    onSuccess: async () => {
      setValueDialogOpen(false);
      setEditingValue(null);
      await queryClient.invalidateQueries({
        queryKey: ["dimensions-settings", "values", selectedTypeId],
      });
    },
  });

  const archiveValueMutation = useMutation({
    mutationFn: (id: string) => customAttributesApi.deleteDimensionValue(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["dimensions-settings", "values", selectedTypeId],
      });
    },
  });

  const openCreateType = () => {
    setEditingType({
      name: "",
      code: "",
      appliesTo: "expense",
      allowMultiple: false,
      required: false,
    });
    setTypeDialogOpen(true);
  };

  return (
    <>
      <CrudListPageLayout
        title="Dimensions"
        subtitle="Create reporting dimensions and manage their values"
        primaryAction={
          <Button onClick={openCreateType}>
            <Plus className="h-4 w-4 mr-2" />
            New dimension
          </Button>
        }
      >
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <ListFilter className="h-4 w-4 text-muted-foreground" />
              <Select value={appliesToFilter} onValueChange={setAppliesToFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="party">Party</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading dimensions...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 text-left">Name</th>
                      <th className="py-2 text-left">Code</th>
                      <th className="py-2 text-left">Applies to</th>
                      <th className="py-2 text-left">Required</th>
                      <th className="py-2 text-left">Multiple</th>
                      <th className="py-2 text-left">Status</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {types.map((type) => (
                      <tr key={type.id} className="border-b border-border/60">
                        <td className="py-2">{type.name}</td>
                        <td className="py-2 font-mono text-xs">{type.code}</td>
                        <td className="py-2">{type.appliesTo.join(", ")}</td>
                        <td className="py-2">{type.requiredFor.join(", ") || "-"}</td>
                        <td className="py-2">{type.allowMultiple ? "Yes" : "No"}</td>
                        <td className="py-2">{type.isActive ? "Active" : "Archived"}</td>
                        <td className="py-2">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTypeId(type.id);
                              }}
                            >
                              Values
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const defaultAppliesTo = type.appliesTo.includes("party")
                                  ? "party"
                                  : "expense";
                                setEditingType({
                                  id: type.id,
                                  name: type.name,
                                  code: type.code,
                                  appliesTo: defaultAppliesTo,
                                  allowMultiple: type.allowMultiple,
                                  required: type.requiredFor.includes(defaultAppliesTo),
                                });
                                setTypeDialogOpen(true);
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
                              title="Archive dimension"
                              description="This will disable the dimension for future usage."
                              onConfirm={() => archiveTypeMutation.mutate(type.id)}
                              isLoading={archiveTypeMutation.isPending}
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

        {selectedTypeId ? (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Dimension values</h3>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingValue({ name: "", code: "" });
                    setValueDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add value
                </Button>
              </div>

              {isValuesLoading ? (
                <div className="text-sm text-muted-foreground">Loading values...</div>
              ) : (
                <div className="space-y-2">
                  {values.map((value) => (
                    <div
                      key={value.id}
                      className="flex items-center justify-between border rounded-md px-3 py-2"
                    >
                      <div>
                        <div className="font-medium">{value.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{value.code}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingValue({ id: value.id, name: value.name, code: value.code });
                            setValueDialogOpen(true);
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
                          title="Archive value"
                          description="This value will no longer be selectable."
                          onConfirm={() => archiveValueMutation.mutate(value.id)}
                          isLoading={archiveValueMutation.isPending}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </CrudListPageLayout>

      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingType?.id ? "Edit dimension" : "Create dimension"}</DialogTitle>
          </DialogHeader>
          {editingType ? (
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={editingType.name}
                  onChange={(event) => setEditingType({ ...editingType, name: event.target.value })}
                />
              </div>
              <div>
                <Label>Code</Label>
                <Input
                  value={editingType.code}
                  onChange={(event) => setEditingType({ ...editingType, code: event.target.value })}
                />
              </div>
              <div>
                <Label>Applies to</Label>
                <Select
                  value={editingType.appliesTo}
                  onValueChange={(value) =>
                    setEditingType({ ...editingType, appliesTo: value as "expense" | "party" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="party">Party</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="allowMultiple"
                  type="checkbox"
                  checked={editingType.allowMultiple}
                  onChange={(event) =>
                    setEditingType({ ...editingType, allowMultiple: event.target.checked })
                  }
                />
                <Label htmlFor="allowMultiple">Allow multiple values</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="required"
                  type="checkbox"
                  checked={editingType.required}
                  onChange={(event) =>
                    setEditingType({ ...editingType, required: event.target.checked })
                  }
                />
                <Label htmlFor="required">Required for this entity type</Label>
              </div>
              <Button
                className="w-full"
                onClick={() => saveTypeMutation.mutate(editingType)}
                disabled={saveTypeMutation.isPending}
              >
                {saveTypeMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={valueDialogOpen} onOpenChange={setValueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingValue?.id ? "Edit value" : "Create value"}</DialogTitle>
          </DialogHeader>
          {editingValue ? (
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={editingValue.name}
                  onChange={(event) =>
                    setEditingValue({ ...editingValue, name: event.target.value })
                  }
                />
              </div>
              <div>
                <Label>Code</Label>
                <Input
                  value={editingValue.code}
                  onChange={(event) =>
                    setEditingValue({ ...editingValue, code: event.target.value })
                  }
                />
              </div>
              <Button
                className="w-full"
                onClick={() => saveValueMutation.mutate(editingValue)}
                disabled={saveValueMutation.isPending}
              >
                {saveValueMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
