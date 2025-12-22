export type PersonalDataItem = {
  module: string;
  resource: string;
  recordId: string;
  data: Record<string, unknown>;
};

export interface PersonalDataCollectorPort {
  moduleName(): string;
  collectPersonalData(args: {
    tenantId: string;
    subjectUserId: string;
  }): Promise<PersonalDataItem[]>;
}
