/**
 * 既存 JSON データを Neon DB に投入する seed スクリプト。
 */

import { config } from "dotenv";
import { eq } from "drizzle-orm";

import bizItemsData from "../data/bizItems.json";
import bizSysLinksData from "../data/bizSysLinks.json";
import bprStagesData from "../data/bprStages.json";
import bprTasksData from "../data/bprTasks.json";
import contextNotesData from "../data/contextNotes.json";
import managementPoliciesData from "../data/managementPolicies.json";
import taskBizLinksData from "../data/taskBizLinks.json";
import systemsData from "../data/systems.json";
import workspaceData from "../data/workspace.json";
import { DEFAULT_WORKSPACE_ID } from "../lib/db/constants";
import { deriveStepStatus } from "../lib/db/mappers";
import { getDb } from "../lib/db/client";
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
} from "../lib/db/schema";
import {
  bprStagesSchema,
  contextNotesSchema,
  departmentsSchema,
  managementPoliciesSchema,
  systemsSchema,
  workspaceSchema,
  type Candidate,
  type Scorecard,
} from "../lib/schema";

config({ path: ".env.local" });

const WORKSPACE_ID = process.env.WORKSPACE_ID ?? DEFAULT_WORKSPACE_ID;

type LegacyScorecard = Scorecard & { stage?: string; attachments?: unknown[] };

function normalizeCandidates(raw: unknown[]): Candidate[] {
  return raw.map((item) => {
    const c = item as Candidate & {
      scorecards: LegacyScorecard[];
    };
    return {
      ...c,
      stage: String(c.stage),
      scorecards: (c.scorecards ?? []).map((sc) => {
        const legacyStage = (sc as LegacyScorecard).stage ?? sc.id;
        return {
          id: sc.id ?? `${c.id}-${legacyStage}`,
          label: sc.label,
          date: sc.date ?? "",
          format: sc.format ?? "",
          interviewer: sc.interviewer ?? "",
          decision: sc.decision,
          comment: sc.comment,
          summary: sc.summary,
          axisScores: sc.axisScores ?? {
            achievements: null,
            thinkingAbility: null,
            communication: null,
            cultureFit: null,
          },
          materials: sc.materials ?? [],
        };
      }),
    };
  });
}

async function clearWorkspace(workspaceId: string) {
  const db = getDb();
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
}

async function seed() {
  const deptResult = departmentsSchema.safeParse(bizItemsData);
  const stagesResult = bprStagesSchema.safeParse(bprStagesData);
  const wsResult = workspaceSchema.safeParse(workspaceData);
  const notesResult = contextNotesSchema.safeParse(contextNotesData);
  const policiesResult = managementPoliciesSchema.safeParse(
    managementPoliciesData,
  );
  const systemsResult = systemsSchema.safeParse(systemsData);

  if (
    !deptResult.success ||
    !stagesResult.success ||
    !wsResult.success ||
    !notesResult.success ||
    !policiesResult.success ||
    !systemsResult.success
  ) {
    throw new Error("JSON データのバリデーションに失敗しました");
  }

  const departmentsData = deptResult.data;
  const bprStagesDataParsed = stagesResult.data;
  const candidates = normalizeCandidates(bprTasksData);
  const workspace = wsResult.data;
  const notes = notesResult.data;
  const policies = policiesResult.data;
  const systemRows = systemsResult.data;

  console.log(`🌱 Seeding workspace: ${WORKSPACE_ID}`);
  const db = getDb();
  await clearWorkspace(WORKSPACE_ID);

  await db.insert(workspaces).values({
    id: WORKSPACE_ID,
    name: workspace.name,
    icon: workspace.icon,
  });

  for (const stage of bprStagesDataParsed) {
    await db.insert(bprStages).values({
      id: stage.id,
      workspaceId: WORKSPACE_ID,
      name: stage.name,
      sortOrder: stage.sortOrder,
    });
  }

  let deptOrder = 0;
  for (const dept of departmentsData) {
    await db.insert(departments).values({
      id: dept.id,
      workspaceId: WORKSPACE_ID,
      name: dept.name,
      sortOrder: deptOrder++,
    });

    let bizOrder = 0;
    for (const position of dept.positions) {
      await db.insert(bizItems).values({
        id: position.id,
        workspaceId: WORKSPACE_ID,
        deptId: dept.id,
        name: position.name,
        taskCount: candidates.filter((c) => c.bizId === position.id).length,
        flags: position.flags,
        sortOrder: bizOrder++,
      });
    }
  }

  let sysOrder = 0;
  for (const system of systemRows) {
    await db.insert(systems).values({
      id: system.id,
      workspaceId: WORKSPACE_ID,
      name: system.name,
      archType: system.archType,
      mainDb: system.mainDb,
      vendor: system.vendor,
      contractStatus: system.contractStatus,
      sortOrder: sysOrder++,
    });
  }

  for (const link of bizSysLinksData) {
    await db.insert(bizSysLinks).values({
      workspaceId: WORKSPACE_ID,
      bizId: link.bizId,
      sysId: link.sysId,
    });
  }

  let taskOrder = 0;
  for (const candidate of candidates) {
    const taskId = candidate.id;
    await db.insert(bprTasks).values({
      id: taskId,
      workspaceId: WORKSPACE_ID,
      bizId: candidate.bizId || candidate.profile.source,
      taskName: candidate.profile.name,
      background: candidate.profile.motivationFull,
      hearingLog: candidate.profile.careerText,
      targetDate: candidate.profile.availableStartDate,
      deptName: candidate.profile.address,
      owner: candidate.owner || candidate.profile.recruiter,
      archived: candidate.archived ?? false,
      stageId: candidate.stage,
      sortOrder: taskOrder++,
    });

    let stepOrder = 0;
    for (const scorecard of candidate.scorecards) {
      await db.insert(taskSteps).values({
        id: scorecard.id,
        workspaceId: WORKSPACE_ID,
        taskId,
        sortOrder: stepOrder++,
        name: scorecard.label,
        status: deriveStepStatus(scorecard.date, scorecard.decision),
        date: scorecard.date,
        format: scorecard.format,
        interviewer: scorecard.interviewer,
        decision: scorecard.decision ?? "",
        comment: scorecard.comment ?? "",
        summary: scorecard.summary ?? "",
        axisScores: scorecard.axisScores,
        materials: scorecard.materials,
      });
    }
  }

  const taskBizLinkRows =
    taskBizLinksData.length > 0
      ? taskBizLinksData
      : candidates
          .filter((c) => c.bizId || c.profile.source)
          .map((c) => ({
            taskId: c.id,
            bizId: c.bizId || c.profile.source,
          }));

  for (const link of taskBizLinkRows) {
    await db.insert(taskBizLinks).values({
      workspaceId: WORKSPACE_ID,
      taskId: link.taskId,
      bizId: link.bizId,
    });
  }

  for (const note of notes) {
    await db.insert(contextNotes).values({
      id: note.id,
      workspaceId: WORKSPACE_ID,
      refType: note.refType,
      refId: note.refId,
      noteType: note.noteType,
      title: note.title,
      body: note.body,
    });
  }

  for (const policy of policies) {
    await db.insert(managementPolicies).values({
      id: policy.id,
      workspaceId: WORKSPACE_ID,
      title: policy.title,
      priority: policy.priority,
    });

    for (const taskId of policy.appliesTo.tasks) {
      await db.insert(policyTaskLinks).values({
        workspaceId: WORKSPACE_ID,
        policyId: policy.id,
        taskId,
      });
    }

    for (const systemId of policy.appliesTo.systems) {
      await db.insert(policySystemLinks).values({
        workspaceId: WORKSPACE_ID,
        policyId: policy.id,
        systemId,
      });
    }
  }

  console.log("✅ Seed complete");
  console.log(`   bpr_stages:  ${bprStagesDataParsed.length}`);
  console.log(`   departments: ${departmentsData.length}`);
  console.log(`   systems:     ${systemRows.length}`);
  console.log(`   tasks:       ${candidates.length}`);
}

seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
