import { deriveStageStatus } from "@/lib/computed/scorecards";
import type {
  BprStage,
  Candidate,
  ContextNote,
  Department,
  ManagementPolicy,
  Scorecard,
} from "@/lib/schema";

import type {
  BizItem,
  BprStage as DbBprStage,
  BprTask,
  ContextNote as DbContextNote,
  Department as DbDepartment,
  ManagementPolicy as DbManagementPolicy,
  PolicySystemLink,
  PolicyTaskLink,
  TaskStep,
} from "./schema";

function mapTaskStepToScorecard(step: TaskStep): Scorecard {
  return {
    id: step.id,
    label: step.name,
    date: step.date,
    format: step.format,
    interviewer: step.interviewer,
    decision: step.decision || undefined,
    comment: step.comment || undefined,
    summary: step.summary || undefined,
    axisScores: step.axisScores,
    materials: step.materials ?? [],
  };
}

export function mapBprTaskToCandidate(
  task: BprTask,
  steps: TaskStep[],
): Candidate {
  const taskSteps = steps
    .filter((s) => s.taskId === task.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    id: task.id,
    profile: {
      name: task.taskName,
      birthday: "",
      source: task.bizId,
      email: "",
      phone: "",
      address: task.deptName,
      recruiter: task.owner,
      desiredSalaryMin: "",
      desiredSalaryMax: "",
      availableStartDate: task.targetDate,
      careerText: task.hearingLog,
      motivationFull: task.background,
    },
    scorecards: taskSteps.map(mapTaskStepToScorecard),
    stage: task.stageId,
    archived: task.archived,
    owner: task.owner,
    bizId: task.bizId,
  };
}

export function mapBprStage(stage: DbBprStage): BprStage {
  return {
    id: stage.id,
    name: stage.name,
    sortOrder: stage.sortOrder,
  };
}

export function mapDepartments(
  departments: DbDepartment[],
  bizItems: BizItem[],
  taskBizLinks: { taskId: string; bizId: string }[],
): Department[] {
  return departments
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((dept) => ({
      id: dept.id,
      name: dept.name,
      positions: bizItems
        .filter((item) => item.deptId === dept.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({
          id: item.id,
          name: item.name,
          count: taskBizLinks.filter((link) => link.bizId === item.id).length,
          flags: item.flags ?? [],
        })),
    }));
}

export function mapContextNote(note: DbContextNote): ContextNote {
  return {
    id: note.id,
    refType: note.refType,
    refId: note.refId,
    noteType: note.noteType,
    title: note.title,
    body: note.body,
  };
}

export function mapManagementPolicies(
  policies: DbManagementPolicy[],
  taskLinks: PolicyTaskLink[],
  systemLinks: PolicySystemLink[],
): ManagementPolicy[] {
  return policies.map((policy) => ({
    id: policy.id,
    title: policy.title,
    priority: policy.priority,
    appliesTo: {
      tasks: taskLinks
        .filter((link) => link.policyId === policy.id)
        .map((link) => link.taskId),
      systems: systemLinks
        .filter((link) => link.policyId === policy.id)
        .map((link) => link.systemId),
    },
  }));
}

export function deriveStepStatus(
  date: string,
  decision?: string,
): "pending" | "planned" | "done" {
  return deriveStageStatus(date, decision);
}
