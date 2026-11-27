import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import type { ChangeEvent, RefCallback } from "react";
import { useTranslation } from "react-i18next";
import { Camera, RefreshCw } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@corely/ui";

export function IssueImageInput({
  imageState,
  handleImageUpload,
  clearImages,
  removeImage,
  isCameraOpen,
  setIsCameraOpen,
  videoRefCallback,
  toggleCamera,
  capturePhoto,
}: {
  imageState: Array<{ id: string; previewUrl: string; isUploading: boolean }>;
  handleImageUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  clearImages: () => void;
  removeImage: (id: string) => void;
  isCameraOpen: boolean;
  setIsCameraOpen: (open: boolean) => void;
  videoRefCallback: RefCallback<HTMLVideoElement>;
  toggleCamera: () => void;
  capturePhoto: () => void;
}) {
  const uiCopy = useUiCopy("ui.issues-issue-image-input");
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{t("issues.attachments.images")}</Label>
        <div className="flex gap-2">
          <Input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            id="image-upload"
            onChange={handleImageUpload}
          />
          {imageState.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearImages}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {t("common.delete")}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("image-upload")?.click()}
          >
            {t("issues.attachments.addImages")}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsCameraOpen(true)}>
            <Camera className="h-4 w-4 mr-2" />
            {t("issues.attachments.takePicture")}
          </Button>
        </div>
      </div>

      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("issues.attachments.takePicture")}</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRefCallback}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <Button variant="ghost" size="icon" onClick={toggleCamera}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={capturePhoto} variant="default" className="w-full mx-4">
              <Camera className="h-4 w-4 mr-2" />
              {t("issues.attachments.takePicture")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {imageState.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {imageState.map((image) => (
            <div
              key={image.id}
              className="group relative aspect-square rounded-md border overflow-hidden bg-muted"
            >
              <img
                src={image.previewUrl}
                alt={uiCopy("preview")}
                className={`w-full h-full object-cover transition-opacity ${image.isUploading ? "opacity-50" : "opacity-100"}`}
                onError={(e) => {
                  if (image.isUploading) {
                    return;
                  } // Ignore errors during upload/switching
                  (e.target as HTMLImageElement).src = image.previewUrl; // Fallback? Or just log
                }}
              />
              {image.isUploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}

              {!image.isUploading && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => removeImage(image.id)}
                  >
                    &times;
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="h-32 bg-muted flex items-center justify-center rounded-md border border-dashed text-muted-foreground text-sm">
          {t("issues.attachments.empty")}
        </div>
      )}
    </div>
  );
}
