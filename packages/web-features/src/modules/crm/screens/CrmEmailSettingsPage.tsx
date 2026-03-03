import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Loader2, Mail, Plug } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@corely/ui";
import type { IntegrationConnectionDto } from "@corely/contracts";
import { integrationsApi } from "@corely/web-shared/lib/integrations-api";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const DEFAULT_FROM_ADDRESS = "nails@corely.one";

const readConfigString = (config: Record<string, unknown>, key: string): string | null => {
  const value = config[key];
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export default function CrmEmailSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeWorkspaceId, isLoading: isWorkspaceLoading } = useWorkspace();

  const [displayName, setDisplayName] = useState("CRM Resend");
  const [fromAddress, setFromAddress] = useState(DEFAULT_FROM_ADDRESS);
  const [replyTo, setReplyTo] = useState(DEFAULT_FROM_ADDRESS);
  const [apiKey, setApiKey] = useState("");

  const { data: connections = [], isLoading: isLoadingConnections } = useQuery({
    queryKey: ["integration-connections", "resend", activeWorkspaceId],
    queryFn: () =>
      integrationsApi.listConnections({
        workspaceId: activeWorkspaceId ?? undefined,
        kind: "resend",
      }),
    enabled: Boolean(activeWorkspaceId),
  });

  const activeConnection = useMemo<IntegrationConnectionDto | null>(() => {
    if (connections.length === 0) {
      return null;
    }
    return connections.find((connection) => connection.status === "active") ?? connections[0];
  }, [connections]);

  useEffect(() => {
    if (!activeConnection) {
      setDisplayName("CRM Resend");
      setFromAddress(DEFAULT_FROM_ADDRESS);
      setReplyTo(DEFAULT_FROM_ADDRESS);
      return;
    }

    const config = activeConnection.config ?? {};
    setDisplayName(activeConnection.displayName ?? "CRM Resend");
    setFromAddress(
      readConfigString(config, "fromAddress") ??
        readConfigString(config, "from") ??
        DEFAULT_FROM_ADDRESS
    );
    setReplyTo(
      readConfigString(config, "replyTo") ??
        readConfigString(config, "reply_to") ??
        readConfigString(config, "fromAddress") ??
        DEFAULT_FROM_ADDRESS
    );
  }, [activeConnection]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeWorkspaceId) {
        throw new Error(t("crm.emailSettings.errors.selectWorkspace"));
      }

      const normalizedDisplayName = displayName.trim() || t("crm.emailSettings.defaultDisplayName");
      const normalizedFrom = fromAddress.trim() || DEFAULT_FROM_ADDRESS;
      const normalizedReplyTo = replyTo.trim() || undefined;
      const normalizedApiKey = apiKey.trim();

      if (!activeConnection) {
        if (!normalizedApiKey) {
          throw new Error(t("crm.emailSettings.errors.apiKeyRequired"));
        }

        return integrationsApi.createConnection({
          workspaceId: activeWorkspaceId,
          kind: "resend",
          authMethod: "api_key",
          displayName: normalizedDisplayName,
          config: {
            fromAddress: normalizedFrom,
            ...(normalizedReplyTo ? { replyTo: normalizedReplyTo } : {}),
          },
          secret: normalizedApiKey,
        });
      }

      return integrationsApi.updateConnection(activeConnection.id, {
        displayName: normalizedDisplayName,
        status: "active",
        config: {
          ...activeConnection.config,
          fromAddress: normalizedFrom,
          ...(normalizedReplyTo ? { replyTo: normalizedReplyTo } : {}),
        },
        ...(normalizedApiKey ? { secret: normalizedApiKey } : {}),
      });
    },
    onSuccess: async () => {
      setApiKey("");
      toast.success(t("crm.emailSettings.saved"));
      await queryClient.invalidateQueries({
        queryKey: ["integration-connections", "resend", activeWorkspaceId],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("crm.emailSettings.errors.saveFailed")
      );
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      if (!activeConnection) {
        throw new Error(t("crm.emailSettings.errors.saveConnectionFirst"));
      }
      return integrationsApi.testConnection(activeConnection.id);
    },
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(t("crm.emailSettings.connectionValid"));
        return;
      }
      toast.error(
        result.detail ?? result.code ?? t("crm.emailSettings.errors.connectionTestFailed")
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("crm.emailSettings.errors.connectionTestFailed")
      );
    },
  });

  const webhookUrl = `${
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
  }/webhooks/resend/inbound`;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/crm/sequences")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-h1 text-foreground">{t("crm.emailSettings.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("crm.emailSettings.subtitle")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {t("crm.emailSettings.connectionTitle")}
          </CardTitle>
          <CardDescription>
            {t("crm.emailSettings.connectionDescription")} <code>{DEFAULT_FROM_ADDRESS}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="crm-resend-display-name">{t("crm.emailSettings.connectionName")}</Label>
            <Input
              id="crm-resend-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={t("crm.emailSettings.defaultDisplayName")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="crm-resend-from">{t("crm.emailSettings.fromAddress")}</Label>
              <Input
                id="crm-resend-from"
                value={fromAddress}
                onChange={(event) => setFromAddress(event.target.value)}
                placeholder={DEFAULT_FROM_ADDRESS}
              />
            </div>
            <div>
              <Label htmlFor="crm-resend-reply-to">{t("crm.emailSettings.replyToAddress")}</Label>
              <Input
                id="crm-resend-reply-to"
                value={replyTo}
                onChange={(event) => setReplyTo(event.target.value)}
                placeholder={DEFAULT_FROM_ADDRESS}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="crm-resend-api-key">
              {t("crm.emailSettings.apiKeyLabel")}{" "}
              {activeConnection ? `(${t("crm.emailSettings.apiKeyLeaveBlank")})` : ""}
            </Label>
            <Input
              id="crm-resend-api-key"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={t("crm.emailSettings.apiKeyPlaceholder")}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="accent"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || isWorkspaceLoading || isLoadingConnections}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {t("common.save")}
            </Button>
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={
                testMutation.isPending ||
                saveMutation.isPending ||
                !activeConnection ||
                isWorkspaceLoading ||
                isLoadingConnections
              }
            >
              {testMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plug className="h-4 w-4" />
              )}
              {t("crm.emailSettings.testConnection")}
            </Button>
          </div>

          {!activeWorkspaceId && (
            <p className="text-sm text-amber-600">{t("crm.emailSettings.noWorkspace")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("crm.emailSettings.inboundWebhookTitle")}</CardTitle>
          <CardDescription>{t("crm.emailSettings.inboundWebhookDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <code className="block text-xs rounded bg-muted px-3 py-2 break-all">{webhookUrl}</code>
          <p className="text-xs text-muted-foreground">
            {t("crm.emailSettings.tenantResolution")} <code>?tenantId=&lt;tenant-id&gt;</code> if
            needed.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("crm.emailSettings.setupGuideTitle")}</CardTitle>
          <CardDescription>{t("crm.emailSettings.setupGuideDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-decimal pl-5 space-y-1">
            <li>{t("crm.emailSettings.guide.step1")}</li>
            <li>{t("crm.emailSettings.guide.step2")}</li>
            <li>
              {t("crm.emailSettings.guide.step3")} <code>email.received</code>.
            </li>
            <li>{t("crm.emailSettings.guide.step4")}</li>
          </ol>
          <p className="text-xs text-muted-foreground">
            {t("crm.emailSettings.guide.localhostNotePrefix")} <code>http://localhost</code>{" "}
            {t("crm.emailSettings.guide.localhostNoteSuffix")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
