export interface WorkflowTask {
  id: string;
  tenantId: string;
  instanceId: string;
  type: string;
  status: string;
  input: string | null;
  assigneeUserId: string | null;
  assigneeRoleId: string | null;
  assigneePermissionKey: string | null;
  // Add other necessary fields
}

export interface ApprovalTaskRepositoryPort {
  listInbox(params: {
    tenantId: string;
    userId: string;
    roleId: string | null;
    permissionKeys: string[];
    status: "PENDING";
  }): Promise<WorkflowTask[]>;
  findById(tenantId: string, id: string): Promise<WorkflowTask | null>;
}

export const APPROVAL_TASK_REPOSITORY_TOKEN = Symbol("APPROVAL_TASK_REPOSITORY_TOKEN");
