export type CmsReaderProps = {
 id: string;
 tenantId: string;
 workspaceId: string;
 email: string;
 passwordHash: string;
 displayName?: string | null;
 createdAt: Date;
 updatedAt: Date;
};

export class CmsReaderEntity {
 id: string;
 tenantId: string;
 workspaceId: string;
 email: string;
 passwordHash: string;
 displayName?: string | null;
 createdAt: Date;
 updatedAt: Date;

 constructor(props: CmsReaderProps) {
 this.id = props.id;
 this.tenantId = props.tenantId;
 this.workspaceId = props.workspaceId;
 this.email = props.email;
 this.passwordHash = props.passwordHash;
 this.displayName = props.displayName ?? null;
 this.createdAt = props.createdAt;
 this.updatedAt = props.updatedAt;
 }

 static create(props: Omit<CmsReaderProps, 'createdAt' | 'updatedAt'> & { createdAt: Date }) {
 return new CmsReaderEntity({
 ...props,
 updatedAt: props.createdAt,
 });
 }
}
