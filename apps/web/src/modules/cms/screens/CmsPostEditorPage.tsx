import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bold,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Redo2,
  Save,
  Sparkles,
  Undo2,
  UploadCloud,
} from "lucide-react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { invalidateResourceQueries } from "@/shared/crud";
import { cmsApi, buildPublicFileUrl } from "@/lib/cms-api";
import { cmsPostKeys } from "../queries";
import { toast } from "sonner";
import type { CmsPostDto, CmsPostStatus } from "@corely/contracts";

const DEFAULT_DOC: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [],
    },
  ],
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);

const statusVariant = (status: CmsPostStatus) => {
  switch (status) {
    case "PUBLISHED":
      return "success";
    case "ARCHIVED":
      return "muted";
    default:
      return "warning";
  }
};

const CmsImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fileId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-file-id"),
        renderHTML: (attributes) =>
          attributes.fileId ? { "data-file-id": attributes.fileId } : {},
      },
    };
  },
});

const toolbarButtonClass = (active?: boolean) =>
  cn(
    "h-8 px-2 text-sm",
    active ? "bg-muted text-foreground" : "text-muted-foreground"
  );

export default function CmsPostEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const editorRef = useRef<Editor | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const [createdPost, setCreatedPost] = useState<CmsPostDto | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [coverImageFileId, setCoverImageFileId] = useState<string | null>(null);
  const [status, setStatus] = useState<CmsPostStatus>("DRAFT");
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [contentJson, setContentJson] = useState<JSONContent>(DEFAULT_DOC);
  const [aiTopic, setAiTopic] = useState("");
  const [aiKeyword, setAiKeyword] = useState("");
  const [aiTone, setAiTone] = useState("Neutral");
  const [aiLanguage, setAiLanguage] = useState("English");
  const [isUploadingInline, setIsUploadingInline] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [selectedImageAlt, setSelectedImageAlt] = useState("");
  const [isImageSelected, setIsImageSelected] = useState(false);

  const postId = id ?? createdPost?.id ?? null;
  const isEdit = Boolean(id);

  const { data: queryPost, isLoading } = useQuery({
    queryKey: cmsPostKeys.detail(id ?? ""),
    queryFn: () => (id ? cmsApi.getPost(id) : Promise.resolve(null)),
    enabled: isEdit,
  });

  const activePost = (queryPost as CmsPostDto | null) ?? createdPost;

  useEffect(() => {
    if (!activePost) {
      return;
    }
    setTitle(activePost.title);
    setSlug(activePost.slug);
    setSlugTouched(true);
    setExcerpt(activePost.excerpt ?? "");
    setCoverImageFileId(activePost.coverImageFileId ?? null);
    setStatus(activePost.status);
    setPublishedAt(activePost.publishedAt ?? null);
    setContentJson((activePost.contentJson ?? DEFAULT_DOC) as JSONContent);
  }, [activePost?.id]);

  const handleInlineImageFiles = async (files: File[]) => {
    if (!editorRef.current) {
      return;
    }
    setIsUploadingInline(true);
    try {
      for (const file of files) {
        const uploaded = await cmsApi.uploadCmsAsset(file, {
          purpose: "cms-inline",
          category: "cms-inline",
        });
        editorRef.current
          .chain()
          .focus()
          .setImage({ src: uploaded.url, alt: "", fileId: uploaded.fileId })
          .run();
      }
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setIsUploadingInline(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      CmsImage.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder: "Start writing your article...",
      }),
    ],
    content: contentJson,
    onUpdate: ({ editor }) => {
      setContentJson(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[320px] w-full rounded-md border border-input bg-background px-4 py-3 text-sm text-foreground focus-visible:outline-none",
      },
      handlePaste: (_view, event) => {
        const items = Array.from(event.clipboardData?.items ?? []);
        const files = items
          .map((item) => item.getAsFile())
          .filter((file): file is File => Boolean(file && file.type.startsWith("image/")));
        if (!files.length) {
          return false;
        }
        void handleInlineImageFiles(files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((file) =>
          file.type.startsWith("image/")
        );
        if (!files.length) {
          return false;
        }
        event.preventDefault();
        void handleInlineImageFiles(files);
        return true;
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor || !activePost?.contentJson) {
      return;
    }
    editor.commands.setContent(activePost.contentJson as JSONContent);
  }, [editor, activePost?.id]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const updateSelection = () => {
      if (!editor.isActive("image")) {
        setIsImageSelected(false);
        setSelectedImageAlt("");
        return;
      }
      const attrs = editor.getAttributes("image") as { alt?: string };
      setIsImageSelected(true);
      setSelectedImageAlt(attrs.alt ?? "");
    };
    updateSelection();
    editor.on("selectionUpdate", updateSelection);
    return () => {
      editor.off("selectionUpdate", updateSelection);
    };
  }, [editor]);

  const coverImageUrl = useMemo(
    () => (coverImageFileId ? buildPublicFileUrl(coverImageFileId) : null),
    [coverImageFileId]
  );

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedTitle = title.trim();
      const nextSlug = slug.trim() || slugify(trimmedTitle);
      if (!trimmedTitle || !nextSlug) {
        throw new Error("Title and slug are required");
      }
      const payload = {
        title: trimmedTitle,
        slug: nextSlug,
        excerpt: excerpt.trim() ? excerpt.trim() : undefined,
        coverImageFileId: coverImageFileId ?? undefined,
      };
      const content = editor?.getJSON() ?? contentJson;
      if (postId) {
        const updated = await cmsApi.updatePost(postId, payload);
        await cmsApi.updatePostContent(postId, { contentJson: content });
        return updated;
      }
      const created = await cmsApi.createPost(payload);
      await cmsApi.updatePostContent(created.id, { contentJson: content });
      return created;
    },
    onSuccess: async (saved) => {
      setCreatedPost(saved);
      setStatus(saved.status);
      setPublishedAt(saved.publishedAt ?? null);
      toast.success("Draft saved");
      await invalidateResourceQueries(queryClient, "cms-posts", { id: saved.id });
      if (!id) {
        navigate(`/cms/posts/${saved.id}/edit`, { replace: true });
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save draft");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!postId) {
        throw new Error("Save the draft first");
      }
      return cmsApi.publishPost(postId);
    },
    onSuccess: async (post) => {
      setCreatedPost(post);
      setStatus(post.status);
      setPublishedAt(post.publishedAt ?? null);
      toast.success("Post published");
      await invalidateResourceQueries(queryClient, "cms-posts", { id: post.id });
    },
    onError: () => toast.error("Failed to publish"),
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => {
      if (!postId) {
        throw new Error("Save the draft first");
      }
      return cmsApi.unpublishPost(postId);
    },
    onSuccess: async (post) => {
      setCreatedPost(post);
      setStatus(post.status);
      setPublishedAt(post.publishedAt ?? null);
      toast.success("Post unpublished");
      await invalidateResourceQueries(queryClient, "cms-posts", { id: post.id });
    },
    onError: () => toast.error("Failed to unpublish"),
  });

  const aiMutation = useMutation({
    mutationFn: async () => {
      if (!aiTopic.trim() || !aiKeyword.trim()) {
        throw new Error("Topic and keyword are required");
      }
      return cmsApi.generateDraft({
        topic: aiTopic.trim(),
        keyword: aiKeyword.trim(),
        tone: aiTone.trim() || undefined,
        language: aiLanguage.trim() || undefined,
      });
    },
    onSuccess: (draft) => {
      setTitle(draft.title);
      setSlug(draft.slugSuggestion);
      setSlugTouched(true);
      setExcerpt(draft.excerpt);
      setContentJson(draft.contentJson as JSONContent);
      editor?.commands.setContent(draft.contentJson as JSONContent);
      toast.success("Draft generated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Draft generation failed");
    },
  });

  const handleCoverUpload = async (file: File | null) => {
    if (!file) {
      return;
    }
    setIsUploadingCover(true);
    try {
      const uploaded = await cmsApi.uploadCmsAsset(file, {
        purpose: "cms-cover",
        category: "cms-cover",
      });
      setCoverImageFileId(uploaded.fileId);
      toast.success("Cover image uploaded");
    } catch (error) {
      toast.error("Failed to upload cover image");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const setLink = () => {
    if (!editor) {
      return;
    }
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter link URL", previousUrl ?? "");
    if (url === null) {
      return;
    }
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const onImageAltChange = (value: string) => {
    setSelectedImageAlt(value);
    if (editor && editor.isActive("image")) {
      editor.chain().focus().updateAttributes("image", { alt: value }).run();
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cms/posts")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-h1 text-foreground">
              {isEdit ? "Edit article" : "Create article"}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={statusVariant(status)}>{status}</Badge>
              {publishedAt ? <span>Published {new Date(publishedAt).toLocaleDateString()}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isLoading}
          >
            <Save className="h-4 w-4" />
            Save draft
          </Button>
          {status === "PUBLISHED" ? (
            <Button
              variant="outline"
              onClick={() => unpublishMutation.mutate()}
              disabled={unpublishMutation.isPending || !postId}
            >
              Unpublish
            </Button>
          ) : (
            <Button
              variant="accent"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending || !postId}
            >
              Publish
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  placeholder="Enter a clear, compelling title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(event) => {
                    setSlug(event.target.value);
                    setSlugTouched(true);
                  }}
                  placeholder="my-article-slug"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(event) => setExcerpt(event.target.value)}
                  placeholder="Short summary for the list view"
                />
              </div>
              <div className="space-y-2">
                <Label>Cover image</Label>
                <div className="flex flex-col gap-3">
                  {coverImageUrl ? (
                    <div className="rounded-md border border-border overflow-hidden">
                      <img src={coverImageUrl} alt="Cover" className="w-full h-48 object-cover" />
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleCoverUpload(event.target.files?.[0] ?? null)}
                    />
                    <Button
                      variant="outline"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={isUploadingCover}
                    >
                      <UploadCloud className="h-4 w-4" />
                      {coverImageUrl ? "Replace cover" : "Upload cover"}
                    </Button>
                    {coverImageUrl ? (
                      <Button variant="ghost" onClick={() => setCoverImageFileId(null)}>
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={toolbarButtonClass(editor?.isActive("bold"))}
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={toolbarButtonClass(editor?.isActive("italic"))}
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={toolbarButtonClass(editor?.isActive("heading", { level: 2 }))}
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={toolbarButtonClass(editor?.isActive("heading", { level: 3 }))}
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                >
                  <Heading3 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={toolbarButtonClass(editor?.isActive("bulletList"))}
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={toolbarButtonClass(editor?.isActive("orderedList"))}
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={setLink}>
                  <LinkIcon className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingInline}
                >
                  <ImageIcon className="h-4 w-4" />
                  {isUploadingInline ? "Uploading..." : "Image"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().undo().run()}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().redo().run()}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) =>
                    handleInlineImageFiles(event.target.files ? Array.from(event.target.files) : [])
                  }
                />
              </div>
              <EditorContent editor={editor} />
              {isImageSelected ? (
                <div className="space-y-2">
                  <Label htmlFor="image-alt">Image alt text</Label>
                  <Input
                    id="image-alt"
                    value={selectedImageAlt}
                    onChange={(event) => onImageAltChange(event.target.value)}
                    placeholder="Describe the image for accessibility"
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-h3 text-foreground">AI Draft</h2>
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-topic">Topic</Label>
                <Input
                  id="ai-topic"
                  value={aiTopic}
                  onChange={(event) => setAiTopic(event.target.value)}
                  placeholder="e.g. Modern inventory tips"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-keyword">Target keyword</Label>
                <Input
                  id="ai-keyword"
                  value={aiKeyword}
                  onChange={(event) => setAiKeyword(event.target.value)}
                  placeholder="keyword to include"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-tone">Tone</Label>
                <Input
                  id="ai-tone"
                  value={aiTone}
                  onChange={(event) => setAiTone(event.target.value)}
                  placeholder="Neutral, friendly, expert..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-language">Language</Label>
                <Input
                  id="ai-language"
                  value={aiLanguage}
                  onChange={(event) => setAiLanguage(event.target.value)}
                  placeholder="English"
                />
              </div>
              <Button
                variant="accent"
                onClick={() => aiMutation.mutate()}
                disabled={aiMutation.isPending}
                className="w-full"
              >
                Generate draft
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-3">
              <h2 className="text-h3 text-foreground">Tips</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>Save drafts often while writing.</li>
                <li>Use a descriptive slug for SEO-friendly URLs.</li>
                <li>Cover images must be public to show on the site.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
