import { eq } from "drizzle-orm";

import { compareBprStages } from "@/lib/bpr-stages";
import type {
  BprStage,
  BizSysLink,
  Candidate,
  ContextNote,
  Department,
  ManagementPolicy,
  System,
} from "@/lib/schema";

import { getDb } from "./client";
import {
  mapBprStage,
  mapBprTaskToCandidate,
  mapContextNote,
  mapDepartments,
  mapManagementPolicies,
} from "./mappers";
import {
  bizItems,
  bizSysLinks,
  bprStages,
  bprTasks,
  contextNotes,
  departments,
  managementPolicies,
  policySystemLinks,
  policyTaskLinks,
  systems,
  taskBizLinks,
  taskSteps,
  workspaces,
} from "./schema";

export type WorkspaceBundle = {
  workspace: { name: string; icon: string };
  bprStages: BprStage[];
  departments: Department[];
  candidates: Candidate[];
  contextNotes: ContextNote[];
  managementPolicies: ManagementPolicy[];
  systems: System[];
  bizSysLinks: BizSysLink[];
};

export async function loadWorkspaceBundle(
  workspaceId: string,
): Promise<WorkspaceBundle> {
  const db = getDb();
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!workspace) {
    throw new Error(
      `ワークスペース "${workspaceId}" が DB に存在しません。npm run db:seed を実行してください。`,
    );
  }

  const [
    stageRows,
    departmentRows,
    bizItemRows,
    taskRows,
    stepRows,
    noteRows,
    policyRows,
    policyTaskLinkRows,
    policySystemLinkRows,
    systemRows,
    bizSysLinkRows,
    taskBizLinkRows,
  ] = await Promise.all([
    db.select().from(bprStages).where(eq(bprStages.workspaceId, workspaceId)),
    db
      .select()
      .from(departments)
      .where(eq(departments.workspaceId, workspaceId)),
    db.select().from(bizItems).where(eq(bizItems.workspaceId, workspaceId)),
    db.select().from(bprTasks).where(eq(bprTasks.workspaceId, workspaceId)),
    db.select().from(taskSteps).where(eq(taskSteps.workspaceId, workspaceId)),
    db
      .select()
      .from(contextNotes)
      .where(eq(contextNotes.workspaceId, workspaceId)),
    db
      .select()
      .from(managementPolicies)
      .where(eq(managementPolicies.workspaceId, workspaceId)),
    db
      .select()
      .from(policyTaskLinks)
      .where(eq(policyTaskLinks.workspaceId, workspaceId)),
    db
      .select()
      .from(policySystemLinks)
      .where(eq(policySystemLinks.workspaceId, workspaceId)),
    db.select().from(systems).where(eq(systems.workspaceId, workspaceId)),
    db
      .select()
      .from(bizSysLinks)
      .where(eq(bizSysLinks.workspaceId, workspaceId)),
    db
      .select()
      .from(taskBizLinks)
      .where(eq(taskBizLinks.workspaceId, workspaceId)),
  ]);

  return {
    workspace: { name: workspace.name, icon: workspace.icon },
    bprStages: stageRows
      .sort(compareBprStages)
      .map(mapBprStage),
    departments: mapDepartments(
      departmentRows,
      bizItemRows,
      taskBizLinkRows.map((row) => ({
        taskId: row.taskId,
        bizId: row.bizId,
      })),
    ),
    candidates: taskRows
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((task) => mapBprTaskToCandidate(task, stepRows)),
    contextNotes: noteRows.map(mapContextNote),
    managementPolicies: mapManagementPolicies(
      policyRows,
      policyTaskLinkRows,
      policySystemLinkRows,
    ),
    systems: systemRows
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((row) => ({
        id: row.id,
        name: row.name,
        archType: row.archType,
        mainDb: row.mainDb,
        vendor: row.vendor,
        contractStatus: row.contractStatus,
      })),
    bizSysLinks: bizSysLinkRows.map((row) => ({
      bizId: row.bizId,
      sysId: row.sysId,
    })),
  };
}
