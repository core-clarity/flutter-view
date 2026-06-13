"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { nextBprStageSortOrder } from "@/lib/bpr-stages";
import { DEFAULT_WORKSPACE_ID } from "@/lib/db/constants";
import { getDb } from "@/lib/db/client";
import { deriveStepStatus } from "@/lib/db/mappers";
import {
  bizItems,
  bprStages,
  bprTasks,
  taskBizLinks,
  taskSteps,
} from "@/lib/db/schema";
import type { AxisKey, Material, Profile } from "@/lib/schema";

function workspaceId() {
  return process.env.WORKSPACE_ID ?? DEFAULT_WORKSPACE_ID;
}

const PROFILE_TASK_FIELD: Partial<
  Record<keyof Profile, keyof typeof bprTasks.$inferInsert>
> = {
  name: "taskName",
  address: "deptName",
  source: "bizId",
  recruiter: "owner",
  careerText: "hearingLog",
  motivationFull: "background",
  availableStartDate: "targetDate",
};

async function resolveFallbackBizId(ws: string): Promise<string> {
  const db = getDb();
  const [row] = await db
    .select({ id: bizItems.id })
    .from(bizItems)
    .where(eq(bizItems.workspaceId, ws))
    .limit(1);
  if (!row) {
    throw new Error(
      "業務項目が存在しないためタスクを追加できません。先に seed を実行してください。",
    );
  }
  return row.id;
}

export async function saveStepMaterials(stepId: string, materials: Material[]) {
  const db = getDb();
  await db
    .update(taskSteps)
    .set({ materials, updatedAt: new Date() })
    .where(
      and(
        eq(taskSteps.id, stepId),
        eq(taskSteps.workspaceId, workspaceId()),
      ),
    );
  revalidatePath("/");
}

type StepTextField =
  | "name"
  | "date"
  | "format"
  | "interviewer"
  | "decision"
  | "comment"
  | "summary";

export async function saveStepField(
  stepId: string,
  field: StepTextField,
  value: string,
) {
  const db = getDb();
  const ws = workspaceId();

  if (field === "date" || field === "decision") {
    const [step] = await db
      .select()
      .from(taskSteps)
      .where(and(eq(taskSteps.id, stepId), eq(taskSteps.workspaceId, ws)))
      .limit(1);
    if (!step) return;

    const nextDate = field === "date" ? value : step.date;
    const nextDecision = field === "decision" ? value : step.decision;
    const status = deriveStepStatus(
      nextDate,
      nextDecision || undefined,
    );

    await db
      .update(taskSteps)
      .set({
        [field]: value,
        status,
        updatedAt: new Date(),
      })
      .where(and(eq(taskSteps.id, stepId), eq(taskSteps.workspaceId, ws)));
  } else {
    await db
      .update(taskSteps)
      .set({ [field]: value, updatedAt: new Date() })
      .where(
        and(
          eq(taskSteps.id, stepId),
          eq(taskSteps.workspaceId, ws),
        ),
      );
  }

  revalidatePath("/");
}

export async function saveStepAxisScore(
  stepId: string,
  axis: AxisKey,
  value: number | null,
) {
  const db = getDb();
  const ws = workspaceId();
  const [step] = await db
    .select()
    .from(taskSteps)
    .where(and(eq(taskSteps.id, stepId), eq(taskSteps.workspaceId, ws)))
    .limit(1);
  if (!step) return;

  await db
    .update(taskSteps)
    .set({
      axisScores: { ...step.axisScores, [axis]: value },
      updatedAt: new Date(),
    })
    .where(and(eq(taskSteps.id, stepId), eq(taskSteps.workspaceId, ws)));
  revalidatePath("/");
}

export async function saveTaskProfileField<K extends keyof Profile>(
  taskId: string,
  field: K,
  value: Profile[K],
) {
  const dbField = PROFILE_TASK_FIELD[field];
  if (!dbField) return;

  const db = getDb();
  const ws = workspaceId();
  await db
    .update(bprTasks)
    .set({ [dbField]: value, updatedAt: new Date() })
    .where(
      and(
        eq(bprTasks.id, taskId),
        eq(bprTasks.workspaceId, ws),
      ),
    );

  if (field === "source" && typeof value === "string" && value) {
    await db
      .insert(taskBizLinks)
      .values({ workspaceId: ws, taskId, bizId: value })
      .onConflictDoNothing();
  }

  revalidatePath("/");
}

export async function saveTaskArchived(taskId: string, archived: boolean) {
  const db = getDb();
  await db
    .update(bprTasks)
    .set({ archived, updatedAt: new Date() })
    .where(
      and(
        eq(bprTasks.id, taskId),
        eq(bprTasks.workspaceId, workspaceId()),
      ),
    );
  revalidatePath("/");
}

export async function addBprStage(name: string): Promise<string> {
  const db = getDb();
  const ws = workspaceId();
  const id = `stage-${Date.now()}`;
  const existingStages = await db
    .select({
      name: bprStages.name,
      sortOrder: bprStages.sortOrder,
    })
    .from(bprStages)
    .where(eq(bprStages.workspaceId, ws));

  await db.insert(bprStages).values({
    id,
    workspaceId: ws,
    name,
    sortOrder: nextBprStageSortOrder(existingStages),
  });
  revalidatePath("/");
  return id;
}

export async function saveTaskStage(
  taskId: string,
  stageId: string,
  currentStepId?: string | null,
) {
  const db = getDb();
  const ws = workspaceId();
  await db
    .update(bprTasks)
    .set({
      stageId,
      ...(currentStepId !== undefined ? { currentStepId } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(bprTasks.id, taskId),
        eq(bprTasks.workspaceId, ws),
      ),
    );
  revalidatePath("/");
}

export async function addTaskStep(
  taskId: string,
  label: string,
  stageId: string,
): Promise<string> {
  const db = getDb();
  const ws = workspaceId();
  const id = `step-${Date.now()}`;
  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(${taskSteps.sortOrder}), -1)` })
    .from(taskSteps)
    .where(
      and(eq(taskSteps.workspaceId, ws), eq(taskSteps.taskId, taskId)),
    );

  await db.insert(taskSteps).values({
    id,
    workspaceId: ws,
    taskId,
    sortOrder: (maxRow?.max ?? -1) + 1,
    name: label,
  });
  await db
    .update(bprTasks)
    .set({ stageId, currentStepId: id, updatedAt: new Date() })
    .where(
      and(
        eq(bprTasks.id, taskId),
        eq(bprTasks.workspaceId, ws),
      ),
    );
  revalidatePath("/");
  return id;
}

export async function addBprTask(stageId: string, taskName: string) {
  const db = getDb();
  const ws = workspaceId();
  const id = `task-${Date.now()}`;
  const bizId = await resolveFallbackBizId(ws);
  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(${bprTasks.sortOrder}), -1)` })
    .from(bprTasks)
    .where(eq(bprTasks.workspaceId, ws));

  await db.insert(bprTasks).values({
    id,
    workspaceId: ws,
    bizId,
    taskName,
    stageId,
    sortOrder: (maxRow?.max ?? -1) + 1,
  });
  await db.insert(taskBizLinks).values({
    workspaceId: ws,
    taskId: id,
    bizId,
  });
  revalidatePath("/");
  return { id, bizId };
}
