export type CmsCommentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SPAM' | 'DELETED';

export type CmsCommentProps = {
 id: string;
 tenantId: string;
 workspaceId: string;
 postId: string;
 readerId: string;
 parentId?: string | null;
 bodyText: string;
 status: CmsCommentStatus;
 readerDisplayName?: string | null;
 createdAt: Date;
 updatedAt: Date;
};

export class CmsCommentEntity {
 id: string;
 tenantId: string;
 workspaceId: string;
 postId: string;
 readerId: string;
 parentId?: string | null;
 bodyText: string;
 status: CmsCommentStatus;
 readerDisplayName?: string | null;
 createdAt: Date;
 updatedAt: Date;

 constructor(props: CmsCommentProps) {
 this.id = props.id;
 this.tenantId = props.tenantId;
 this.workspaceId = props.workspaceId;
 this.postId = props.postId;
 this.readerId = props.readerId;
 this.parentId = props.parentId ?? null;
 this.bodyText = props.bodyText;
 this.status = props.status;
 this.readerDisplayName = props.readerDisplayName ?? null;
 this.createdAt = props.createdAt;
 this.updatedAt = props.updatedAt;
 }

 static create(props: Omit<CmsCommentProps, 'createdAt' | 'updatedAt'> & { createdAt: Date }) {
 return new CmsCommentEntity({
 ...props,
 updatedAt: props.createdAt,
 });
 }

 moderate(status: CmsCommentStatus, now: Date) {
 this.status = status;
 this.updatedAt = now;
 }
}
