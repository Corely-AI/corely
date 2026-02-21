import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ApproveApplicationInput,
  CreateApplicationInput,
  CreateClassGroupResourceInput,
  CreateMilestoneInput,
  CreateProgramInput,
  CreateCohortFromProgramInput,
  ListClassGroupsInput,
  ListEnrollmentsInput,
  ListProgramsInput,
  ReorderClassGroupResourcesInput,
  UpdateClassGroupInput,
  UpdateClassGroupResourceInput,
  UpdateCohortLifecycleInput,
  UpdateEnrollmentInput,
  UpdateMilestoneInput,
  UpdateProgramInput,
  UpsertCohortTeamInput,
  UpsertEnrollmentBillingPlanInput,
  UpsertMilestoneCompletionInput,
  GenerateBillingPlanInvoicesInput,
} from "@corely/contracts";
import { classesApi } from "@/lib/classes-api";
import { classesAcademyQueryKeys } from "../queries";

export function useCohortsListQuery(params?: ListClassGroupsInput) {
  return useQuery({
    queryKey: classesAcademyQueryKeys.cohorts.list(params),
    queryFn: () => classesApi.listClassGroups(params),
  });
}

export function useCohortQuery(cohortId: string | undefined) {
  return useQuery({
    queryKey: cohortId
      ? classesAcademyQueryKeys.cohorts.detail(cohortId)
      : ["classes", "cohorts", "missing"],
    queryFn: () => {
      if (!cohortId) {
        throw new Error("Missing cohort id");
      }
      return classesApi.getClassGroup(cohortId);
    },
    enabled: Boolean(cohortId),
  });
}

export function useUpdateCohortMutation(cohortId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateClassGroupInput) => {
      if (!cohortId) {
        throw new Error("Missing cohort id");
      }
      return classesApi.updateClassGroup(cohortId, input);
    },
    onSuccess: async (_result, _variables) => {
      if (!cohortId) {
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: classesAcademyQueryKeys.cohorts.detail(cohortId),
        }),
        queryClient.invalidateQueries({ queryKey: ["classes", "cohorts", "list"] }),
      ]);
    },
  });
}

export function useUpdateCohortLifecycleMutation(cohortId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCohortLifecycleInput) => {
      if (!cohortId) {
        throw new Error("Missing cohort id");
      }
      return classesApi.updateCohortLifecycle(cohortId, input);
    },
    onSuccess: async () => {
      if (!cohortId) {
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: classesAcademyQueryKeys.cohorts.detail(cohortId),
        }),
        queryClient.invalidateQueries({ queryKey: ["classes", "cohorts", "list"] }),
      ]);
    },
  });
}

export function useCohortTeamQuery(cohortId: string | undefined) {
  return useQuery({
    queryKey: cohortId
      ? classesAcademyQueryKeys.cohorts.team(cohortId)
      : ["classes", "cohorts", "missing", "team"],
    queryFn: () => {
      if (!cohortId) {
        throw new Error("Missing cohort id");
      }
      return classesApi.getCohortTeam(cohortId);
    },
    enabled: Boolean(cohortId),
  });
}

export function useUpsertCohortTeamMutation(cohortId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertCohortTeamInput) => {
      if (!cohortId) {
        throw new Error("Missing cohort id");
      }
      return classesApi.upsertCohortTeam(cohortId, input);
    },
    onSuccess: async () => {
      if (!cohortId) {
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: classesAcademyQueryKeys.cohorts.team(cohortId),
      });
    },
  });
}

export function useEnrollmentsQuery(
  classGroupId: string | undefined,
  params?: ListEnrollmentsInput
) {
  return useQuery({
    queryKey: classGroupId
      ? classesAcademyQueryKeys.cohorts.enrollments(classGroupId, params)
      : ["classes", "cohorts", "missing", "enrollments"],
    queryFn: () => {
      if (!classGroupId) {
        throw new Error("Missing cohort id");
      }
      return classesApi.listEnrollments({ ...params, classGroupId });
    },
    enabled: Boolean(classGroupId),
  });
}

export function useCreateApplicationMutation(classGroupId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateApplicationInput) => {
      if (!classGroupId) {
        throw new Error("Missing cohort id");
      }
      return classesApi.createApplication(classGroupId, input);
    },
    onSuccess: async () => {
      if (!classGroupId) {
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: classesAcademyQueryKeys.cohorts.enrollments(classGroupId),
      });
    },
  });
}

export function useApproveApplicationMutation(cohortId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      enrollmentId,
      input,
    }: {
      enrollmentId: string;
      input: ApproveApplicationInput;
    }) => classesApi.approveApplication(enrollmentId, input),
    onSuccess: async () => {
      if (!cohortId) {
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: classesAcademyQueryKeys.cohorts.enrollments(cohortId),
      });
    },
  });
}

export function useUpdateEnrollmentMutation(cohortId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ enrollmentId, input }: { enrollmentId: string; input: UpdateEnrollmentInput }) =>
      classesApi.updateEnrollment(enrollmentId, input),
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: classesAcademyQueryKeys.enrollments.billingPlan(variables.enrollmentId),
      });
      if (!cohortId) {
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: classesAcademyQueryKeys.cohorts.enrollments(cohortId),
      });
    },
  });
}

export function useBillingPlanQuery(enrollmentId: string | undefined) {
  return useQuery({
    queryKey: enrollmentId
      ? classesAcademyQueryKeys.enrollments.billingPlan(enrollmentId)
      : ["classes", "enrollments", "missing", "billingPlan"],
    queryFn: () => {
      if (!enrollmentId) {
        throw new Error("Missing enrollment id");
      }
      return classesApi.getEnrollmentBillingPlan(enrollmentId);
    },
    enabled: Boolean(enrollmentId),
  });
}

export function useUpsertBillingPlanMutation(enrollmentId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertEnrollmentBillingPlanInput) => {
      if (!enrollmentId) {
        throw new Error("Missing enrollment id");
      }
      return classesApi.upsertEnrollmentBillingPlan(enrollmentId, input);
    },
    onSuccess: async () => {
      if (!enrollmentId) {
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: classesAcademyQueryKeys.enrollments.billingPlan(enrollmentId),
      });
    },
  });
}

export function useGenerateInvoicesMutation(enrollmentId: string | undefined) {
  return useMutation({
    mutationFn: (input: GenerateBillingPlanInvoicesInput) => {
      if (!enrollmentId) {
        throw new Error("Missing enrollment id");
      }
      return classesApi.generateBillingPlanInvoices(enrollmentId, input);
    },
  });
}

export function useMilestonesQuery(classGroupId: string | undefined) {
  return useQuery({
    queryKey: classGroupId
      ? classesAcademyQueryKeys.cohorts.milestones(classGroupId)
      : ["classes", "cohorts", "missing", "milestones"],
    queryFn: () => {
      if (!classGroupId) {
        throw new Error("Missing cohort id");
      }
      return classesApi.listMilestones(classGroupId);
    },
    enabled: Boolean(classGroupId),
  });
}

export function useMilestoneMutations(classGroupId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    if (!classGroupId) {
      return;
    }
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: classesAcademyQueryKeys.cohorts.milestones(classGroupId),
      }),
      queryClient.invalidateQueries({
        queryKey: classesAcademyQueryKeys.cohorts.outcomesSummary(classGroupId),
      }),
    ]);
  };

  const create = useMutation({
    mutationFn: (input: CreateMilestoneInput) => {
      if (!classGroupId) {
        throw new Error("Missing cohort id");
      }
      return classesApi.createMilestone(classGroupId, input);
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ milestoneId, input }: { milestoneId: string; input: UpdateMilestoneInput }) =>
      classesApi.updateMilestone(milestoneId, input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (milestoneId: string) => classesApi.deleteMilestone(milestoneId),
    onSuccess: invalidate,
  });

  const upsertCompletion = useMutation({
    mutationFn: (input: {
      milestoneId: string;
      enrollmentId: string;
      payload: UpsertMilestoneCompletionInput;
    }) =>
      classesApi.upsertMilestoneCompletion(input.milestoneId, input.enrollmentId, input.payload),
    onSuccess: invalidate,
  });

  return { create, update, remove, upsertCompletion };
}

export function useOutcomesSummaryQuery(classGroupId: string | undefined) {
  return useQuery({
    queryKey: classGroupId
      ? classesAcademyQueryKeys.cohorts.outcomesSummary(classGroupId)
      : ["classes", "cohorts", "missing", "outcomesSummary"],
    queryFn: () => {
      if (!classGroupId) {
        throw new Error("Missing cohort id");
      }
      return classesApi.getOutcomesSummary(classGroupId);
    },
    enabled: Boolean(classGroupId),
  });
}

export function useResourcesQuery(classGroupId: string | undefined) {
  return useQuery({
    queryKey: classGroupId
      ? classesAcademyQueryKeys.cohorts.resources(classGroupId)
      : ["classes", "cohorts", "missing", "resources"],
    queryFn: () => {
      if (!classGroupId) {
        throw new Error("Missing cohort id");
      }
      return classesApi.listResources(classGroupId);
    },
    enabled: Boolean(classGroupId),
  });
}

export function useResourceMutations(classGroupId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    if (!classGroupId) {
      return;
    }
    await queryClient.invalidateQueries({
      queryKey: classesAcademyQueryKeys.cohorts.resources(classGroupId),
    });
  };

  const create = useMutation({
    mutationFn: (input: CreateClassGroupResourceInput) => {
      if (!classGroupId) {
        throw new Error("Missing cohort id");
      }
      return classesApi.createResource(classGroupId, input);
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({
      resourceId,
      input,
    }: {
      resourceId: string;
      input: UpdateClassGroupResourceInput;
    }) => classesApi.updateResource(resourceId, input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (resourceId: string) => classesApi.deleteResource(resourceId),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

export function useReorderResourcesMutation(classGroupId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReorderClassGroupResourcesInput) => {
      if (!classGroupId) {
        throw new Error("Missing cohort id");
      }
      return classesApi.reorderResources(classGroupId, input);
    },
    onSuccess: async () => {
      if (!classGroupId) {
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: classesAcademyQueryKeys.cohorts.resources(classGroupId),
      });
    },
  });
}

export function useProgramsListQuery(params?: ListProgramsInput) {
  return useQuery({
    queryKey: classesAcademyQueryKeys.programs.list(params),
    queryFn: () => classesApi.listPrograms(params),
  });
}

export function useProgramQuery(programId: string | undefined) {
  return useQuery({
    queryKey: programId
      ? classesAcademyQueryKeys.programs.detail(programId)
      : ["classes", "programs", "missing"],
    queryFn: () => {
      if (!programId) {
        throw new Error("Missing program id");
      }
      return classesApi.getProgram(programId);
    },
    enabled: Boolean(programId),
  });
}

export function useProgramMutations(programId?: string) {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (input: CreateProgramInput) => classesApi.createProgram(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["classes", "programs", "list"] });
    },
  });

  const update = useMutation({
    mutationFn: (input: UpdateProgramInput) => {
      if (!programId) {
        throw new Error("Missing program id");
      }
      return classesApi.updateProgram(programId, input);
    },
    onSuccess: async () => {
      if (programId) {
        await queryClient.invalidateQueries({
          queryKey: classesAcademyQueryKeys.programs.detail(programId),
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["classes", "programs", "list"] });
    },
  });

  return { create, update };
}

export function useCreateCohortFromProgramMutation(programId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCohortFromProgramInput) => {
      if (!programId) {
        throw new Error("Missing program id");
      }
      return classesApi.createCohortFromProgram(programId, input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["classes", "cohorts", "list"] });
    },
  });
}
