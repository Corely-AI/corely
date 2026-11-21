interface TaskCreationScope {
  readonly tenantId: string;
  readonly workspaceId: string;
}

interface TaskCreationFacts {
  readonly dueAt: string | null;
}

export interface TaskCreationRegistration extends TaskCreationScope {
  readonly check: (facts: TaskCreationFacts) => string | undefined;
}

export function taskCreationRejection(
  policies: readonly TaskCreationRegistration[],
  scope: TaskCreationScope,
  facts: TaskCreationFacts
): string | undefined {
  for (const policy of policies) {
    if (policy.tenantId === scope.tenantId && policy.workspaceId === scope.workspaceId) {
      const message = policy.check(facts);
      if (message) {return message;}
    }
  }
}
