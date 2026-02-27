import { ArrowLeft, Save } from "lucide-react";
import type { WebsitePageStatus } from "@corely/contracts";
import { Badge, Button } from "@corely/ui";
import { statusVariant } from "./website-page-editor.utils";

type WebsitePageEditorHeaderProps = {
  isEdit: boolean;
  status: WebsitePageStatus;
  canSave: boolean;
  savePending: boolean;
  onBack: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onSave: () => void;
};

export function WebsitePageEditorHeader({
  isEdit,
  status,
  canSave,
  savePending,
  onBack,
  onPublish,
  onUnpublish,
  onSave,
}: WebsitePageEditorHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <div className="text-lg font-semibold">{isEdit ? "Edit page" : "Create page"}</div>
          <div className="text-sm text-muted-foreground">
            Define route, template, SEO, and blocks
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isEdit ? <Badge variant={statusVariant(status)}>{status}</Badge> : null}
        {isEdit ? (
          status === "PUBLISHED" ? (
            <Button variant="outline" onClick={onUnpublish}>
              Unpublish
            </Button>
          ) : (
            <Button variant="outline" onClick={onPublish}>
              Publish
            </Button>
          )
        ) : null}
        <Button variant="accent" disabled={!canSave || savePending} onClick={onSave}>
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  );
}
