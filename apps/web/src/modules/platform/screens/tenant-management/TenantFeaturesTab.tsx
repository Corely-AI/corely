import React, { useState } from "react";
import {
  type ResolvedFeatureValue,
  platformEntitlementsApi,
} from "@/lib/platform-entitlements-api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@corely/ui";
import { Input } from "@corely/ui";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Search, Save, RotateCcw } from "lucide-react";
import { useToast } from "@corely/ui";
import { Switch } from "@corely/ui";
import { useTranslation } from "react-i18next";

interface TenantFeaturesTabProps {
  tenantId: string;
  features: ResolvedFeatureValue[];
  onRefresh: () => void;
}

export function TenantFeaturesTab({ tenantId, features, onRefresh }: TenantFeaturesTabProps) {
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Record<string, any>>({});

  const getFeatureLabel = (key: string) => t(`featureFlags.${key}`, { defaultValue: key });

  const filteredFeatures = features.filter(
    (f) =>
      f.key.toLowerCase().includes(search.toLowerCase()) ||
      getFeatureLabel(f.key).toLowerCase().includes(search.toLowerCase()) ||
      (typeof f.value === "string" && f.value.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSave = async (key: string, value: any) => {
    try {
      await platformEntitlementsApi.updateFeatures(tenantId, [{ key, value }]);
      toast({ title: "Feature updated" });
      onRefresh();
      setEditing((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to update feature" });
    }
  };

  const handleReset = async (key: string) => {
    try {
      await platformEntitlementsApi.resetFeature(tenantId, key);
      toast({ title: "Feature reset to default" });
      onRefresh();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to reset feature" });
    }
  };

  const handleChange = (key: string, value: any) => {
    setEditing((prev) => ({ ...prev, [key]: value }));
  };

  const renderEditor = (feat: ResolvedFeatureValue, pendingValue: any) => {
    const val = pendingValue !== undefined ? pendingValue : feat.value;
    const type = typeof feat.value;

    if (type === "boolean") {
      // Switch
      return <Switch checked={!!val} onCheckedChange={(c) => handleChange(feat.key, c)} />;
    }
    if (type === "number") {
      return (
        <Input
          type="number"
          value={val}
          onChange={(e) => handleChange(feat.key, parseFloat(e.target.value))}
          className="w-32"
        />
      );
    }
    // Default string/json
    return (
      <Input
        value={typeof val === "object" ? JSON.stringify(val) : val}
        onChange={(e) => handleChange(feat.key, e.target.value)}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search features..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFeatures.map((feat) => {
              const isEdited = editing[feat.key] !== undefined;
              const label = getFeatureLabel(feat.key);
              return (
                <TableRow key={feat.key}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{label}</div>
                      <div className="font-mono text-xs text-muted-foreground">{feat.key}</div>
                    </div>
                  </TableCell>
                  <TableCell>{renderEditor(feat, editing[feat.key])}</TableCell>
                  <TableCell>
                    <Badge variant={feat.source === "tenantOverride" ? "secondary" : "outline"}>
                      {feat.source}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {isEdited && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleSave(feat.key, editing[feat.key])}
                        >
                          <Save className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      {feat.source === "tenantOverride" && (
                        <Button size="icon" variant="ghost" onClick={() => handleReset(feat.key)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
