export type ErasureResult = {
  module: string;
  outcome: "DELETED" | "ANONYMIZED" | "SKIPPED";
  reason?: string;
  affectedRecordIds?: string[];
};

export interface PersonalDataEraserPort {
  moduleName(): string;
  erasePersonalData(args: { tenantId: string; subjectUserId: string }): Promise<ErasureResult>;
}
