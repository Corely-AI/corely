import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import { workspacesApi } from "@/shared/workspaces/workspaces-api";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";

interface ContactDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDetailsDialog({ open, onOpenChange }: ContactDetailsDialogProps) {
  const { activeWorkspace, refresh } = useWorkspace();
  const queryClient = useQueryClient();
  
  const [phone, setPhone] = useState(activeWorkspace?.phone || "");
  const [email, setEmail] = useState(activeWorkspace?.email || "");
  const [website, setWebsite] = useState(activeWorkspace?.website || "");
  const [emailError, setEmailError] = useState("");
  const [websiteError, setWebsiteError] = useState("");

  // Update local state when workspace changes
  React.useEffect(() => {
    setPhone(activeWorkspace?.phone || "");
    setEmail(activeWorkspace?.email || "");
    setWebsite(activeWorkspace?.website || "");
    setEmailError("");
    setWebsiteError("");
  }, [activeWorkspace]);

  // Validation functions
  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError("");
      return true; // Empty is valid
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(value);
    setEmailError(isValid ? "" : "Invalid email address");
    return isValid;
  };

  const validateWebsite = (value: string): boolean => {
    if (!value.trim()) {
      setWebsiteError("");
      return true; // Empty is valid
    }
    try {
      // Allow URLs with or without protocol
      const urlToTest = value.startsWith('http://') || value.startsWith('https://') 
        ? value 
        : `https://${value}`;
      const url = new URL(urlToTest);
      
      // Additional validation: must have a proper domain with at least one dot
      // This matches Zod's URL validation more closely
      const hostname = url.hostname;
      if (!hostname.includes('.') || hostname.length < 3) {
        setWebsiteError("Invalid URL - must be a valid domain");
        return false;
      }
      
      setWebsiteError("");
      return true;
    } catch {
      setWebsiteError("Invalid URL");
      return false;
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    validateEmail(value);
  };

  const handleWebsiteChange = (value: string) => {
    setWebsite(value);
    validateWebsite(value);
  };

  // Check if form has any data or changes
  const hasChanges = 
    phone.trim() !== (activeWorkspace?.phone || "") ||
    email.trim() !== (activeWorkspace?.email || "") ||
    website.trim() !== (activeWorkspace?.website || "");

  const hasAnyData = phone.trim() || email.trim() || website.trim();

  const isFormValid = !emailError && !websiteError && hasAnyData && hasChanges;

  const updateMutation = useMutation({
    mutationFn: async (data: { phone?: string; email?: string; website?: string }) => {
      if (!activeWorkspace?.id) {
        throw new Error("No active workspace");
      }
      return workspacesApi.updateWorkspace(activeWorkspace.id, data);
    },
    onSuccess: async () => {
      await refresh();
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Contact details updated successfully");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update contact details: ${error.message}`);
    },
  });

  const handleSave = () => {
    // Final validation before save
    const isEmailValid = validateEmail(email);
    const isWebsiteValid = validateWebsite(website);
    
    if (!isEmailValid || !isWebsiteValid) {
      return;
    }

    // Normalize website URL - add protocol if missing
    let normalizedWebsite = website.trim();
    if (normalizedWebsite && !normalizedWebsite.startsWith('http://') && !normalizedWebsite.startsWith('https://')) {
      normalizedWebsite = `https://${normalizedWebsite}`;
    }

    updateMutation.mutate({
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      website: normalizedWebsite || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Your contact details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              Phone <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 015775146912"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="e.g. foo@company.com"
              className={emailError ? "border-destructive" : ""}
            />
            {emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website" className="text-sm font-medium">
              Website <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => handleWebsiteChange(e.target.value)}
              placeholder="e.g. www.company.com"
              className={websiteError ? "border-destructive" : ""}
            />
            {websiteError && (
              <p className="text-sm text-destructive">{websiteError}</p>
            )}
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
            disabled={!isFormValid || updateMutation.isPending}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
