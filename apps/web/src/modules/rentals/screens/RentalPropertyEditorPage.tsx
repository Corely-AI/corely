import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, UploadCloud, ExternalLink } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { RichTextEditor } from "@/shared/ui/rich-text-editor";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { invalidateResourceQueries } from "@/shared/crud";
import { rentalsApi, buildPublicFileUrl } from "@/lib/rentals-api";
import { cmsApi } from "@/lib/cms-api"; // reuse for image upload
import { rentalPropertyKeys, rentalCategoryKeys } from "../queries";
import { toast } from "sonner";
import { Checkbox } from "@/shared/ui/checkbox";
import type { RentalStatus } from "@corely/contracts";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { getPublicRentalUrl } from "@/shared/lib/public-urls";
import { QuickCreateCategoryDialog } from "../components/QuickCreateCategoryDialog";
import { CurrencySelect } from "@/shared/components/CurrencySelect";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);

const statusVariant = (status: RentalStatus) => {
  switch (status) {
    case "PUBLISHED":
      return "success";
    case "ARCHIVED":
      return "muted";
    default:
      return "warning";
  }
};

type GalleryImage = { fileId: string; altText: string; sortOrder: number; isUploading?: boolean };
type RentalPropertyDraft = {
  name: string;
  slug: string;
  slugTouched: boolean;
  summary: string;
  descriptionHtml: string;
  maxGuests: number;
  price?: number;
  currency: string;
  coverImageFileId: string | null;
  images: GalleryImage[];
  status: RentalStatus;
  selectedCategoryIds: string[];
  updatedAt: string;
};

const isBlobUrl = (value: string) => value.startsWith("blob:");

export default function RentalPropertyEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const { activeWorkspace } = useWorkspace();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [summary, setSummary] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [maxGuests, setMaxGuests] = useState<number>(2);
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [currency, setCurrency] = useState<string>("USD");
  const [coverImageFileId, setCoverImageFileId] = useState<string | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [status, setStatus] = useState<RentalStatus>("DRAFT");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const isEdit = Boolean(id);
  const draftQueryKey = useMemo(
    () => [
      "rentals",
      "property-editor-draft",
      {
        workspaceId: activeWorkspace?.id ?? "global",
        propertyId: id ?? "new",
      },
    ],
    [activeWorkspace?.id, id]
  );
  const hydratedRef = useRef(false);

  const { data: property, isLoading } = useQuery({
    queryKey: rentalPropertyKeys.detail(id ?? ""),
    queryFn: () => (id ? rentalsApi.getProperty(id) : Promise.resolve(null)),
    enabled: isEdit,
  });

  const { data: availableCategories = [] } = useQuery({
    queryKey: rentalCategoryKeys.list(),
    queryFn: () => rentalsApi.listCategories(),
  });

  const { data: draft } = useQuery<RentalPropertyDraft | null>({
    queryKey: draftQueryKey,
    queryFn: async () => null,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useEffect(() => {
    hydratedRef.current = false;
    setName("");
    setSlug("");
    setSlugTouched(false);
    setSummary("");
    setDescriptionHtml("");
    setMaxGuests(2);
    setPrice(undefined);
    setCurrency("USD");
    setCoverImageFileId(null);
    setImages([]);
    setStatus("DRAFT");
    setSelectedCategoryIds([]);
  }, [draftQueryKey]);

  useEffect(() => {
    if (hydratedRef.current) {
      return;
    }

    if (draft) {
      hydratedRef.current = true;
      setName(draft.name);
      setSlug(draft.slug);
      setSlugTouched(draft.slugTouched);
      setSummary(draft.summary);
      setDescriptionHtml(draft.descriptionHtml);
      setMaxGuests(draft.maxGuests);
      setPrice(draft.price);
      setCurrency(draft.currency);
      setCoverImageFileId(draft.coverImageFileId);
      setImages(draft.images);
      setStatus(draft.status);
      setSelectedCategoryIds(draft.selectedCategoryIds);
      return;
    }

    if (!property) {
      return;
    }

    hydratedRef.current = true;
    setName(property.name);
    setSlug(property.slug);
    setSlugTouched(true);
    setSummary(property.summary ?? "");
    setDescriptionHtml(property.descriptionHtml ?? "");
    setMaxGuests(property.maxGuests ?? 2);
    setPrice(property.price ?? undefined);
    setCurrency(property.currency ?? "USD");
    setCoverImageFileId(property.coverImageFileId ?? null);
    setImages(
      (property.images ?? []).map((img) => ({
        fileId: img.fileId,
        altText: img.altText ?? "",
        sortOrder: img.sortOrder,
      }))
    );
    setStatus(property.status);
    setSelectedCategoryIds((property.categories ?? []).map((c) => c.id));
  }, [draft, property]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const draft: RentalPropertyDraft = {
        name,
        slug,
        slugTouched,
        summary,
        descriptionHtml,
        maxGuests,
        price,
        currency,
        coverImageFileId,
        images: images
          .filter((img) => !img.isUploading && !isBlobUrl(img.fileId))
          .map((img, index) => ({
            fileId: img.fileId,
            altText: img.altText,
            sortOrder: index,
          })),
        status,
        selectedCategoryIds,
        updatedAt: new Date().toISOString(),
      };
      queryClient.setQueryData(draftQueryKey, draft);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [
    name,
    slug,
    slugTouched,
    summary,
    descriptionHtml,
    maxGuests,
    price,
    currency,
    coverImageFileId,
    images,
    status,
    selectedCategoryIds,
    draftQueryKey,
    queryClient,
  ]);

  const coverImageUrl = useMemo(
    () => (coverImageFileId ? buildPublicFileUrl(coverImageFileId) : null),
    [coverImageFileId]
  );

  const isUploading = useMemo(() => images.some((img) => img.isUploading), [images]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        summary: summary.trim() || undefined,
        descriptionHtml: descriptionHtml.trim() || undefined,
        maxGuests,
        price,
        currency,
        coverImageFileId: coverImageFileId ?? undefined,
        images: images.map((img, index) => ({
          fileId: img.fileId,
          altText: img.altText.trim(),
          sortOrder: index,
        })),
        categoryIds: selectedCategoryIds,
      };

      if (id) {
        return rentalsApi.updateProperty(id, { id, ...payload });
      }
      return rentalsApi.createProperty(payload);
    },
    onSuccess: async (saved) => {
      toast.success(isEdit ? "Property updated" : "Property created");
      queryClient.removeQueries({ queryKey: draftQueryKey, exact: true });
      await invalidateResourceQueries(queryClient, "rentals/properties", { id: saved.id });
      if (!id) {
        navigate(`/rentals/properties/${saved.id}/edit`, { replace: true });
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save property");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error("Save first");
      }
      return rentalsApi.publishProperty(id);
    },
    onSuccess: async (updated) => {
      setStatus(updated.status);
      toast.success("Property published");
      await invalidateResourceQueries(queryClient, "rentals/properties", { id: updated.id });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error("Save first");
      }
      return rentalsApi.unpublishProperty(id);
    },
    onSuccess: async (updated) => {
      setStatus(updated.status);
      toast.success("Property unpublished");
      await invalidateResourceQueries(queryClient, "rentals/properties", { id: updated.id });
    },
  });

  const handleCoverUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    // First file is always the cover
    const file = files[0];
    try {
      const uploaded = await cmsApi.uploadCmsAsset(file, {
        purpose: "rental-cover",
        category: "rental-cover",
      });
      setCoverImageFileId(uploaded.fileId);
      toast.success("Cover image updated");

      // If more files selected, add them to the gallery
      if (files.length > 1) {
        const remaining = Array.from(files).slice(1);
        await handleGalleryUpload(remaining);
      }
    } catch {
      toast.error("Cover upload failed. Check CORS configuration.");
    }
  };

  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const handleGalleryUpload = async (files: FileList | File[] | null) => {
    if (!files) {
      return;
    }
    const filesArray = files instanceof FileList ? Array.from(files) : files;
    if (filesArray.length === 0) {
      return;
    }

    // Create preview entries immediately
    const newPreviews = filesArray.map((file, index) => ({
      fileId: URL.createObjectURL(file), // temp local url
      altText: "",
      sortOrder: images.length + index,
      isUploading: true,
    }));

    setImages((prev) => [...prev, ...newPreviews]);

    // Upload files
    for (const file of filesArray) {
      try {
        const uploaded = await cmsApi.uploadCmsAsset(file, {
          purpose: "rental-gallery",
          category: "rental-gallery",
        });

        setImages((prev) => {
          // Find the first item that is still 'uploading' (matching the preview we just added)
          const index = prev.findIndex((img) => img.isUploading);
          if (index === -1) {
            return prev;
          }

          const updated = [...prev];
          updated[index] = {
            fileId: uploaded.fileId,
            altText: prev[index].altText ?? "",
            sortOrder: index,
          };
          return updated;
        });
      } catch {
        toast.error(`Failed to upload ${file.name}`);
        // Remove the failed preview
        setImages((prev) => {
          const index = prev.findIndex((img) => img.isUploading);
          if (index === -1) {
            return prev;
          }
          return prev.filter((_, i) => i !== index);
        });
      }
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllImages = () => {
    setImages([]);
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/rentals/properties")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-h1 text-foreground">{isEdit ? "Edit Property" : "New Property"}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={statusVariant(status)}>{status}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isUploading}
          >
            <Save className="h-4 w-4" />
            {isUploading ? "Uploading..." : "Save changes"}
          </Button>
          {isEdit &&
            (status === "PUBLISHED" ? (
              <>
                <Button variant="outline" asChild>
                  <a
                    href={getPublicRentalUrl(slug, activeWorkspace?.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Listing
                  </a>
                </Button>
                <Button variant="outline" onClick={() => unpublishMutation.mutate()}>
                  Unpublish
                </Button>
              </>
            ) : (
              <Button variant="accent" onClick={() => publishMutation.mutate()}>
                Publish
              </Button>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Property Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Sunset Villa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugTouched(true);
                  }}
                  placeholder="sunset-villa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Short description for listings"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description</Label>
                <RichTextEditor
                  value={descriptionHtml}
                  onChange={setDescriptionHtml}
                  placeholder="Detailed information for guests"
                  aiConfig={{
                    presetId: "rental-description",
                    allowedTags: ["p", "ul", "ol", "li", "strong", "em", "a"],
                    allowLinks: true,
                    entityContext: {
                      module: "rentals",
                      entityType: "RentalProperty",
                      entityId: id,
                      workspaceId: activeWorkspace?.id,
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-h3 text-foreground">Property Gallery</h2>
                <div className="flex gap-2">
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleGalleryUpload(e.target.files)}
                  />
                  {images.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllImages}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      Clear All
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => galleryInputRef.current?.click()}
                  >
                    <UploadCloud className="h-4 w-4 mr-2" />
                    Upload Images
                  </Button>
                </div>
              </div>

              {images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((img, index) => (
                    <div
                      key={index}
                      className="group relative aspect-square rounded-md border overflow-hidden bg-muted"
                    >
                      <img
                        src={
                          img.fileId.startsWith("blob:")
                            ? img.fileId
                            : buildPublicFileUrl(img.fileId)
                        }
                        alt={`Gallery ${index}`}
                        className={`w-full h-full object-cover ${img.isUploading ? "opacity-50 grayscale" : ""}`}
                      />
                      {img.isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <span className="text-xs font-semibold text-white bg-black/50 px-2 py-1 rounded">
                            Uploading...
                          </span>
                        </div>
                      )}
                      {!img.isUploading && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => removeImage(index)}
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
                  No gallery images uploaded yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-h3 text-foreground">Configuration</h2>
              <div className="space-y-2">
                <Label htmlFor="price">Price per night</Label>
                <div className="flex gap-2">
                  <Input
                    id="price"
                    type="number"
                    value={price ?? ""}
                    onChange={(e) =>
                      setPrice(e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    className="flex-1"
                    placeholder="0.00"
                  />
                  <CurrencySelect
                    value={currency}
                    onValueChange={setCurrency}
                    persistCustomKey="rentals.currencies"
                    showSymbol={false}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="guests">Max Guests</Label>
                <Input
                  id="guests"
                  type="number"
                  value={maxGuests}
                  onChange={(e) => setMaxGuests(parseInt(e.target.value, 10))}
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label>Categories</Label>
                  <QuickCreateCategoryDialog
                    onCreated={(id) => {
                      if (!selectedCategoryIds.includes(id)) {
                        setSelectedCategoryIds((prev) => [...prev, id]);
                      }
                    }}
                  />
                </div>
                {availableCategories.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">
                    No categories found. Click the + icon above to create one.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {availableCategories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cat-${category.id}`}
                          checked={selectedCategoryIds.includes(category.id)}
                          onCheckedChange={() => toggleCategory(category.id)}
                        />
                        <Label
                          htmlFor={`cat-${category.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {category.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <div className="space-y-3">
                  {coverImageUrl ? (
                    <img
                      src={coverImageUrl}
                      alt="Cover"
                      className="w-full h-40 object-cover rounded-md border"
                    />
                  ) : (
                    <div className="h-40 bg-muted flex items-center justify-center rounded-md border border-dashed text-muted-foreground text-sm">
                      No image
                    </div>
                  )}
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleCoverUpload(e.target.files)}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    <UploadCloud className="h-4 w-4 mr-2" />
                    {coverImageUrl ? "Change image" : "Upload image"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
