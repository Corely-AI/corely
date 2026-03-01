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
import { workspacesApi } from "@corely/web-shared/shared/workspaces/workspaces-api";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";

interface TaxDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaxDetailsDialog({ open, onOpenChange }: TaxDetailsDialogProps) {
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
      toast.success("Tax details updated successfully");
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
          <DialogTitle className="text-2xl font-semibold">Your tax details</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Any changes in the tax details will be applied to your account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tax Number */}
          <div className="space-y-2">
            <Label htmlFor="tax-number" className="text-sm font-medium">
              Tax number (Steuernummer)
            </Label>
            <Input
              id="tax-number"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="e.g. 33/262/02239"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Your business/freelance tax number from your local tax office. Only for self-employed
              folks.
            </p>
          </div>

          {/* VAT Number */}
          <div className="space-y-2">
            <Label htmlFor="vat-number" className="text-sm font-medium">
              VAT number (Umsatzsteuer-ID){" "}
              <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="vat-number"
              value={vatId}
              onChange={(e) => setVatId(e.target.value)}
              placeholder="e.g. DE123456789"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Your EU business number for cross-border trade. For businesses and freelancers dealing
              with other EU countries.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
