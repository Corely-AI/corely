import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@corely/ui";
import { ListFilter, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { crmApi } from "@/lib/crm-api";
import { EmptyState } from "@/shared/components/EmptyState";
import { CrudListPageLayout, CrudRowActions, ConfirmDeleteDialog } from "@/shared/crud";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { useCrmChannels } from "@/modules/crm/hooks/useChannels";
import {
  channelTemplateQueryKeys,
  useChannelTemplates,
} from "@/modules/crm/hooks/useChannelTemplates";
import { EngagementTemplateDialog } from "./engagement-template-dialog";
import {
  isEmailChannel,
  makeInitialFormState,
  type TemplateFormState,
} from "./engagement-template-utils";

const formatUpdatedAt = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleString();
};

export default function EngagementTemplatesSettingsPage() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspace();
  const { data: channels = [] } = useCrmChannels();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialChannel = searchParams.get("channel") || "all";
  const [channelFilter, setChannelFilter] = useState<string>(initialChannel);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState<TemplateFormState>(
    makeInitialFormState(initialChannel)
  );
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const {
    data: templateData,
    isLoading,
    isError,
    refetch,
  } = useChannelTemplates({
    workspaceId: activeWorkspaceId,
    channel: channelFilter === "all" ? undefined : channelFilter,
    q: query.trim() || undefined,
  });

  const templates = templateData?.workspaceTemplates ?? [];

  const channelLabels = useMemo(
    () => new Map(channels.map((channel) => [channel.key, channel.label])),
    [channels]
  );

  const openCreateDialog = () => {
    setFormState(makeInitialFormState(channelFilter));
    setDialogOpen(true);
  };

  const openEditDialog = (template: {
    id: string;
    channel: string;
    name: string;
    subject: string | null;
    body: string;
  }) => {
    setFormState({
      id: template.id,
      channel: template.channel,
      name: template.name,
      subject: template.subject ?? "",
      body: template.body,
    });
    setDialogOpen(true);
  };

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!activeWorkspaceId) {
        throw new Error("Workspace is required");
      }

      const normalizedName = formState.name.trim();
      const normalizedBody = formState.body.trim();
      const normalizedSubject = formState.subject.trim();

      if (!normalizedName) {
        throw new Error("Template name is required");
      }

      if (!normalizedBody) {
        throw new Error("Template body is required");
      }

      if (isEmailChannel(formState.channel) && !normalizedSubject) {
        throw new Error("Subject is required for email templates");
      }

      if (formState.id) {
        return crmApi.updateChannelTemplate(activeWorkspaceId, formState.id, {
          channel: formState.channel,
          name: normalizedName,
          subject: isEmailChannel(formState.channel) ? normalizedSubject : undefined,
          body: normalizedBody,
        });
      }

      return crmApi.createChannelTemplate(activeWorkspaceId, {
        channel: formState.channel,
        name: normalizedName,
        subject: isEmailChannel(formState.channel) ? normalizedSubject : undefined,
        body: normalizedBody,
      });
    },
    onSuccess: async () => {
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: channelTemplateQueryKeys.all });
      toast.success(formState.id ? "Template updated" : "Template created");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save template");
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      if (!activeWorkspaceId) {
        throw new Error("Workspace is required");
      }
      return crmApi.deleteChannelTemplate(activeWorkspaceId, templateId);
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: channelTemplateQueryKeys.all });
      toast.success("Template deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete template");
    },
  });

  const generateTemplateWithAiMutation = useMutation({
    mutationFn: async (context?: string) => {
      if (!activeWorkspaceId) {
        throw new Error("Workspace is required");
      }

      return crmApi.generateChannelTemplateAi(activeWorkspaceId, {
        channel: formState.channel,
        context,
      });
    },
    onSuccess: (generated) => {
      setFormState((current) => ({
        ...current,
        subject: isEmailChannel(current.channel) ? (generated.subject ?? current.subject) : "",
        body: generated.body,
      }));
      toast.success("AI template generated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate template");
    },
  });

  const handleChannelFilterChange = (value: string) => {
    setChannelFilter(value);

    const next = new URLSearchParams(searchParams);
    if (value === "all") {
      next.delete("channel");
    } else {
      next.set("channel", value);
    }
    setSearchParams(next, { replace: true });
  };

  if (!activeWorkspaceId) {
    return (
      <CrudListPageLayout
        title="Templates"
        subtitle="Create reusable channel templates per workspace"
      >
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Select a workspace to manage templates.
          </CardContent>
        </Card>
      </CrudListPageLayout>
    );
  }

  return (
    <>
      <CrudListPageLayout
        title="Templates"
        subtitle="Manage reusable email and messaging templates for this workspace"
        primaryAction={
          <Button variant="accent" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New template
          </Button>
        }
        toolbar={
          <>
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-muted-foreground" />
              <Select value={channelFilter} onValueChange={handleChannelFilterChange}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All channels</SelectItem>
                  {channels.map((channel) => (
                    <SelectItem key={channel.key} value={channel.key}>
                      {channel.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search templates by name"
              className="w-full max-w-sm"
            />
          </>
        }
      >
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading templates...</div>
            ) : isError ? (
              <div className="p-8 text-center space-y-3">
                <div className="text-destructive">Failed to load templates.</div>
                <Button variant="outline" onClick={() => void refetch()}>
                  Retry
                </Button>
              </div>
            ) : templates.length === 0 ? (
              <EmptyState
                icon={Plus}
                title="No templates yet"
                description="Create your first workspace template to speed up channel outreach."
                action={
                  <Button variant="accent" onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    New template
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Name
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Channel
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Updated
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((template) => (
                      <tr key={template.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          {template.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {channelLabels.get(template.channel) ?? template.channel}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatUpdatedAt(template.updatedAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CrudRowActions
                            primaryAction={{
                              label: "Edit",
                              onClick: () =>
                                openEditDialog({
                                  id: template.id,
                                  channel: template.channel,
                                  name: template.name,
                                  subject: template.subject,
                                  body: template.body,
                                }),
                            }}
                            secondaryActions={[
                              {
                                label: "Delete",
                                destructive: true,
                                icon: <Trash2 className="h-4 w-4" />,
                                onClick: () => setDeleteTarget(template.id),
                              },
                            ]}
                          />
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

      <EngagementTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        formState={formState}
        setFormState={setFormState}
        channels={channels}
        isSaving={saveTemplateMutation.isPending}
        isGeneratingAi={generateTemplateWithAiMutation.isPending}
        onSave={() => saveTemplateMutation.mutate()}
        onGenerateAi={(context) => generateTemplateWithAiMutation.mutate(context)}
      />

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        trigger={null}
        title="Delete template"
        description="This will permanently delete the template from this workspace."
        isLoading={deleteTemplateMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }
          deleteTemplateMutation.mutate(deleteTarget);
        }}
      />
    </>
  );
}
