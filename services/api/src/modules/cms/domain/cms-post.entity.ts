export type CmsPostStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type CmsPostProps = {
  id: string;
  tenantId: string;
  workspaceId: string;
  status: CmsPostStatus;
  slug: string;
  title: string;
  excerpt?: string | null;
  coverImageFileId?: string | null;
  contentJson: unknown;
  contentHtml: string;
  contentText: string;
  publishedAt?: Date | null;
  authorUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

export class CmsPostEntity {
  id: string;
  tenantId: string;
  workspaceId: string;
  status: CmsPostStatus;
  slug: string;
  title: string;
  excerpt?: string | null;
  coverImageFileId?: string | null;
  contentJson: unknown;
  contentHtml: string;
  contentText: string;
  publishedAt?: Date | null;
  authorUserId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: CmsPostProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.workspaceId = props.workspaceId;
    this.status = props.status;
    this.slug = props.slug;
    this.title = props.title;
    this.excerpt = props.excerpt ?? null;
    this.coverImageFileId = props.coverImageFileId ?? null;
    this.contentJson = props.contentJson;
    this.contentHtml = props.contentHtml;
    this.contentText = props.contentText;
    this.publishedAt = props.publishedAt ?? null;
    this.authorUserId = props.authorUserId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: Omit<CmsPostProps, "createdAt" | "updatedAt"> & { createdAt: Date }) {
    return new CmsPostEntity({
      ...props,
      updatedAt: props.createdAt,
    });
  }

  updateMeta(params: {
    title?: string;
    slug?: string;
    excerpt?: string | null;
    coverImageFileId?: string | null;
    status?: CmsPostStatus;
    now: Date;
  }) {
    if (params.title !== undefined) {
      this.title = params.title;
    }
    if (params.slug !== undefined) {
      this.slug = params.slug;
    }
    if (params.excerpt !== undefined) {
      this.excerpt = params.excerpt;
    }
    if (params.coverImageFileId !== undefined) {
      this.coverImageFileId = params.coverImageFileId;
    }
    if (params.status !== undefined) {
      this.status = params.status;
    }
    this.touch(params.now);
  }

  updateContent(params: {
    contentJson: unknown;
    contentHtml: string;
    contentText: string;
    now: Date;
  }) {
    this.contentJson = params.contentJson;
    this.contentHtml = params.contentHtml;
    this.contentText = params.contentText;
    this.touch(params.now);
  }

  publish(now: Date) {
    if (this.status === "ARCHIVED") {
      throw new Error("Cannot publish an archived post");
    }
    this.status = "PUBLISHED";
    this.publishedAt = now;
    this.touch(now);
  }

  unpublish(now: Date) {
    if (this.status === "ARCHIVED") {
      throw new Error("Cannot unpublish an archived post");
    }
    this.status = "DRAFT";
    this.publishedAt = null;
    this.touch(now);
  }

  archive(now: Date) {
    this.status = "ARCHIVED";
    this.touch(now);
  }

  private touch(now: Date) {
    this.updatedAt = now;
  }
}
