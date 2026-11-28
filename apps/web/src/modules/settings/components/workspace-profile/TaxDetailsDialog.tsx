import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { toast } from "sonner";
import { workspacesApi } from "@/shared/workspaces/workspaces-api";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";

interface TaxDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaxDetailsDialog({ open, onOpenChange }: TaxDetailsDialogProps) {
  const uiCopy = useUiCopy("ui.settings-workspace-profile-taxdetailsdialog");
  const { activeWorkspace, refresh } = useWorkspace();
  const queryClient = useQueryClient();

  const [taxId, setTaxId] = useState(activeWorkspace?.taxId || "");
  const [vatId, setVatId] = useState(activeWorkspace?.vatId || "");

  // Update local state when workspace changes
  React.useEffect(() => {
    setTaxId(activeWorkspace?.taxId || "");
    setVatId(activeWorkspace?.vatId || "");
  }, [activeWorkspace]);

  const updateMutation = useMutation({
    mutationFn: async (data: { taxId?: string; vatId?: string }) => {
      if (!activeWorkspace?.id) {
        throw new Error("No active workspace");
      }
      return workspacesApi.updateWorkspace(activeWorkspace.id, data);
    },
    onSuccess: async () => {
      await refresh();
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success(uiCopy("tax-details-updated-successfully"));
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update tax details: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      taxId: taxId.trim() || undefined,
      vatId: vatId.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">{uiCopy("your-tax-details")}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {uiCopy("any-changes-in-the")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tax Number */}
          <div className="space-y-2">
            <Label htmlFor="tax-number" className="text-sm font-medium">
              {uiCopy("tax-number-steuernummer")}
            </Label>
            <Input
              id="tax-number"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder={uiCopy("e-g-33-262")}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">{uiCopy("your-business-freelance-tax")}</p>
          </div>

          {/* VAT Number */}
          <div className="space-y-2">
            <Label htmlFor="vat-number" className="text-sm font-medium">
              {uiCopy("vat-number-umsatzsteuer-id")}{" "}
              <span className="text-muted-foreground font-normal">{uiCopy("optional")}</span>
            </Label>
            <Input
              id="vat-number"
              value={vatId}
              onChange={(e) => setVatId(e.target.value)}
              placeholder={uiCopy("e-g-de123456789")}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">{uiCopy("your-eu-business-number")}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            {uiCopy("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {updateMutation.isPending ? uiCopy("saving") : uiCopy("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
