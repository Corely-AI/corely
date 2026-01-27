import { type CmsReaderEntity } from '../../domain/cms-reader.entity';

export const CMS_READER_REPOSITORY_PORT = 'cms/reader-repository';

export interface CmsReaderRepositoryPort {
 create(reader: CmsReaderEntity): Promise<void>;
 findByEmail(tenantId: string, email: string): Promise<CmsReaderEntity | null>;
 findById(tenantId: string, readerId: string): Promise<CmsReaderEntity | null>;
}
