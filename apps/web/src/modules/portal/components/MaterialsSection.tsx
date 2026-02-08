import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@corely/ui";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:...;base64, prefix
      resolve(result.split(",")[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

interface MaterialsSectionProps {
  entityId: string;
  entityType: "PARTY" | "CLASS_GROUP" | "CLASS_SESSION";
}

export const MaterialsSection = ({ entityId, entityType }: MaterialsSectionProps) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: materials, isLoading } = useQuery({
    queryKey: ["materials", entityType, entityId],
    queryFn: async () => {
      const res: any = await apiClient.get(
        `/documents/by-entity?entityType=${entityType}&entityId=${entityId}`
      );
      return Array.isArray(res) ? res : (res?.items ?? []);
    },
    enabled: Boolean(entityId),
  });

  const handleUpload = async () => {
    if (!file || !displayName) {
      toast.error("Please provide a name and select a file");
      return;
    }

    setUploading(true);
    try {
      // 1. Convert file to base64
      const base64 = await fileToBase64(file);

      // 2. Upload via base64 endpoint
      const result: any = await apiClient.post("/documents/upload-base64", {
        filename: displayName || file.name,
        contentType: file.type || "application/octet-stream",
        base64,
        purpose: "portal-material",
      });

      const documentId = result.document?.id ?? result.id;

      // 3. Link to entity
      await apiClient.post(`/documents/${documentId}/link`, {
        entityId,
        entityType,
      });

      toast.success("Material added successfully");
      setIsUploadOpen(false);
      setDisplayName("");
      setFile(null);
      void queryClient.invalidateQueries({ queryKey: ["materials", entityType, entityId] });
    } catch (err: any) {
      toast.error("Failed to upload material: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const unlinkMutation = useMutation({
    mutationFn: (documentId: string) =>
      apiClient.post(`/documents/${documentId}/unlink`, { entityId, entityType }),
    onSuccess: () => {
      toast.success("Material unlinked");
      void queryClient.invalidateQueries({ queryKey: ["materials", entityType, entityId] });
    },
  });

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Learning Materials</div>
          <Button variant="outline" size="sm" onClick={() => setIsUploadOpen(true)}>
            <FileUp className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                  Name
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                  Type
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                  Added
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-muted-foreground" colSpan={4}>
                    Loading...
                  </td>
                </tr>
              ) : (
                materials?.map((m: any) => (
                  <tr
                    key={m.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium">{m.displayName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {m.contentType || "unknown"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Unlink this material?")) {
                            unlinkMutation.mutate(m.id);
                          }
                        }}
                        disabled={unlinkMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
              {!isLoading && materials?.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-muted-foreground" colSpan={4}>
                    No materials linked yet. Shared with{" "}
                    {entityType.replace("_", " ").toLowerCase()}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Material</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Maths Exercises Week 1"
                />
              </div>
              <div className="space-y-2">
                <Label>File</Label>
                <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload & Link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
