/**
 * Drizzle ORM スキーマ（ドラフト）
 *
 * 設計前提:
 *   ① 本部 → 要チェック業務 → BPRタスク の 3 層 + biz_sys_links で業務↔システム n:m
 *   ② 進行ステージはタスクごとに自由登録（task_steps テーブル）
 *   ③ 全データを workspace_id でスコープ（ワークスペース切替）
 *
 * 旧 scorecards / 固定 6 段階 stageKey は廃止し、task_steps に統合。
 * workspace.json は workspaces テーブルへ移行。
 */

import { relations } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import type { AxisScoresJson, BizFlagsJson, MaterialJson } from "./types";

// ===== Enums =====

export const stepStatusEnum = pgEnum("step_status", [
  "pending",
  "planned",
  "done",
]);

export const contextNoteRefTypeEnum = pgEnum("context_note_ref_type", [
  "task",
  "system",
]);

export const contextNoteTypeEnum = pgEnum("context_note_type", [
  "法令リスク",
  "内部統制",
  "業界慣行",
  "ブラックリスト",
]);

export const policyPriorityEnum = pgEnum("policy_priority", [
  "critical",
  "high",
]);

// ===== ワークスペース（③: 切替の単位）=====

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("briefcase"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ===== ①: 本部 → 要チェック業務 =====

export const departments = pgTable(
  "departments",
  {
    id: text("id").notNull(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.id, t.workspaceId] })],
);

export const bizItems = pgTable(
  "biz_items",
  {
    id: text("id").notNull(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    deptId: text("dept_id").notNull(),
    name: text("name").notNull(),
    /** Pane 1 バッジ用。集計値だが表示用に保持（将来は VIEW で代替可） */
    taskCount: integer("task_count").notNull().default(0),
    flags: jsonb("flags").$type<BizFlagsJson>().notNull().default([]),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.workspaceId] }),
    foreignKey({
      columns: [t.workspaceId, t.deptId],
      foreignColumns: [departments.workspaceId, departments.id],
    }),
    unique("biz_items_workspace_dept_name").on(
      t.workspaceId,
      t.deptId,
      t.name,
    ),
  ],
);

// ===== 業務システム台帳 =====

export const systems = pgTable(
  "systems",
  {
    id: text("id").notNull(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** TSV の「システム番号」。未割当行は null */
    systemNumber: text("system_number"),
    name: text("name").notNull(),
    archType: text("arch_type").notNull().default(""),
    mainDb: text("main_db").notNull().default(""),
    vendor: text("vendor").notNull().default(""),
    contractStatus: text("contract_status").notNull().default(""),
    /** TSV の「本部紐づけ」。組織上の所管本部 */
    deptId: text("dept_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.id, t.workspaceId] })],
);

// ===== Pane 2: BPR 進行ステージ（ワークスペース単位・自由追加）=====

export const bprStages = pgTable(
  "bpr_stages",
  {
    id: text("id").notNull(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.workspaceId] }),
    unique("bpr_stages_workspace_name").on(t.workspaceId, t.name),
  ],
);

// ===== ①: BPRタスク（要チェック業務の下）=====

export const bprTasks = pgTable(
  "bpr_tasks",
  {
    id: text("id").notNull(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    bizId: text("biz_id").notNull(),
    taskName: text("task_name").notNull(),
    /** profile.motivationFull → タスクの背景・目的（TSV の「タスク情報」1 行目） */
    background: text("background").notNull().default(""),
    /** profile.careerText → ヒアリング経緯・調査ログ */
    hearingLog: text("hearing_log").notNull().default(""),
    /** profile.availableStartDate → 目標完了日 */
    targetDate: text("target_date").notNull().default(""),
    /** profile.address → 所属本部名（表示用スナップショット） */
    deptName: text("dept_name").notNull().default(""),
    /** 主語（ボール持ち者） */
    owner: text("owner").notNull().default(""),
    archived: boolean("archived").notNull().default(false),
    /** Pane 2 の進行ステージ列（bpr_stages.id） */
    stageId: text("stage_id").notNull(),
    /** ②: 現在フォーカス中のステップ。null なら未着手 */
    currentStepId: text("current_step_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.workspaceId] }),
    foreignKey({
      columns: [t.workspaceId, t.bizId],
      foreignColumns: [bizItems.workspaceId, bizItems.id],
    }),
    foreignKey({
      columns: [t.workspaceId, t.stageId],
      foreignColumns: [bprStages.workspaceId, bprStages.id],
    }),
    unique("bpr_tasks_workspace_biz_name").on(
      t.workspaceId,
      t.bizId,
      t.taskName,
    ),
  ],
);

// ===== ②: 進行ステップ（自由登録・旧 scorecards 統合）=====

export const taskSteps = pgTable(
  "task_steps",
  {
    id: text("id").notNull(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    taskId: text("task_id").notNull(),
    /** TSV 下段の行順。D&D 並べ替えにも使用 */
    sortOrder: integer("sort_order").notNull(),
    /** 自由記述のステップ名（例: "RFP作成", "2026年2月現新"） */
    name: text("name").notNull(),
    status: stepStatusEnum("status").notNull().default("pending"),
    date: text("date").notNull().default(""),
    format: text("format").notNull().default(""),
    interviewer: text("interviewer").notNull().default(""),
    decision: text("decision").notNull().default(""),
    comment: text("comment").notNull().default(""),
    summary: text("summary").notNull().default(""),
    axisScores: jsonb("axis_scores").$type<AxisScoresJson>().notNull().default({
      achievements: null,
      thinkingAbility: null,
      communication: null,
      cultureFit: null,
    }),
    materials: jsonb("materials")
      .$type<MaterialJson[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.workspaceId] }),
    foreignKey({
      columns: [t.workspaceId, t.taskId],
      foreignColumns: [bprTasks.workspaceId, bprTasks.id],
    }),
    unique("task_steps_workspace_task_order").on(
      t.workspaceId,
      t.taskId,
      t.sortOrder,
    ),
  ],
);

// ===== n:m リンク =====

/** BPRタスク ↔ 要チェック業務（複数本部にまたがるタスク用 n:m） */
export const taskBizLinks = pgTable(
  "task_biz_links",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    taskId: text("task_id").notNull(),
    bizId: text("biz_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.taskId, t.bizId] }),
    foreignKey({
      columns: [t.workspaceId, t.taskId],
      foreignColumns: [bprTasks.workspaceId, bprTasks.id],
    }),
    foreignKey({
      columns: [t.workspaceId, t.bizId],
      foreignColumns: [bizItems.workspaceId, bizItems.id],
    }),
  ],
);

/** 要チェック業務 ↔ 業務システム */
export const bizSysLinks = pgTable(
  "biz_sys_links",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    bizId: text("biz_id").notNull(),
    sysId: text("sys_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.bizId, t.sysId] }),
    foreignKey({
      columns: [t.workspaceId, t.bizId],
      foreignColumns: [bizItems.workspaceId, bizItems.id],
    }),
    foreignKey({
      columns: [t.workspaceId, t.sysId],
      foreignColumns: [systems.workspaceId, systems.id],
    }),
  ],
);

/** 経営方針 ↔ BPRタスク */
export const policyTaskLinks = pgTable(
  "policy_task_links",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    policyId: text("policy_id").notNull(),
    taskId: text("task_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.policyId, t.taskId] }),
    foreignKey({
      columns: [t.workspaceId, t.policyId],
      foreignColumns: [
        managementPolicies.workspaceId,
        managementPolicies.id,
      ],
    }),
    foreignKey({
      columns: [t.workspaceId, t.taskId],
      foreignColumns: [bprTasks.workspaceId, bprTasks.id],
    }),
  ],
);

/** 経営方針 ↔ 業務システム */
export const policySystemLinks = pgTable(
  "policy_system_links",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    policyId: text("policy_id").notNull(),
    systemId: text("system_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.policyId, t.systemId] }),
    foreignKey({
      columns: [t.workspaceId, t.policyId],
      foreignColumns: [
        managementPolicies.workspaceId,
        managementPolicies.id,
      ],
    }),
    foreignKey({
      columns: [t.workspaceId, t.systemId],
      foreignColumns: [systems.workspaceId, systems.id],
    }),
  ],
);

// ===== 空中視点メモ =====

export const contextNotes = pgTable(
  "context_notes",
  {
    id: text("id").notNull(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    refType: contextNoteRefTypeEnum("ref_type").notNull(),
    refId: text("ref_id").notNull(),
    noteType: contextNoteTypeEnum("note_type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.id, t.workspaceId] })],
);

// ===== 経営方針 =====

export const managementPolicies = pgTable(
  "management_policies",
  {
    id: text("id").notNull(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    priority: policyPriorityEnum("priority").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.id, t.workspaceId] })],
);

// ===== Relations（Drizzle relational query 用）=====

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  departments: many(departments),
  bizItems: many(bizItems),
  bprStages: many(bprStages),
  systems: many(systems),
  bprTasks: many(bprTasks),
  taskSteps: many(taskSteps),
  contextNotes: many(contextNotes),
  managementPolicies: many(managementPolicies),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [departments.workspaceId],
    references: [workspaces.id],
  }),
  bizItems: many(bizItems),
  systems: many(systems),
}));

export const bprStagesRelations = relations(bprStages, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [bprStages.workspaceId],
    references: [workspaces.id],
  }),
  tasks: many(bprTasks),
}));

export const bizItemsRelations = relations(bizItems, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [bizItems.workspaceId],
    references: [workspaces.id],
  }),
  department: one(departments, {
    fields: [bizItems.workspaceId, bizItems.deptId],
    references: [departments.workspaceId, departments.id],
  }),
  bprTasks: many(bprTasks),
  taskBizLinks: many(taskBizLinks),
  bizSysLinks: many(bizSysLinks),
}));

export const systemsRelations = relations(systems, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [systems.workspaceId],
    references: [workspaces.id],
  }),
  department: one(departments, {
    fields: [systems.workspaceId, systems.deptId],
    references: [departments.workspaceId, departments.id],
  }),
  bizSysLinks: many(bizSysLinks),
  policySystemLinks: many(policySystemLinks),
}));

export const bprTasksRelations = relations(bprTasks, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [bprTasks.workspaceId],
    references: [workspaces.id],
  }),
  bizItem: one(bizItems, {
    fields: [bprTasks.workspaceId, bprTasks.bizId],
    references: [bizItems.workspaceId, bizItems.id],
  }),
  stage: one(bprStages, {
    fields: [bprTasks.workspaceId, bprTasks.stageId],
    references: [bprStages.workspaceId, bprStages.id],
  }),
  steps: many(taskSteps),
  currentStep: one(taskSteps, {
    fields: [bprTasks.workspaceId, bprTasks.currentStepId],
    references: [taskSteps.workspaceId, taskSteps.id],
  }),
  taskBizLinks: many(taskBizLinks),
  policyTaskLinks: many(policyTaskLinks),
}));

export const taskBizLinksRelations = relations(taskBizLinks, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [taskBizLinks.workspaceId],
    references: [workspaces.id],
  }),
  task: one(bprTasks, {
    fields: [taskBizLinks.workspaceId, taskBizLinks.taskId],
    references: [bprTasks.workspaceId, bprTasks.id],
  }),
  bizItem: one(bizItems, {
    fields: [taskBizLinks.workspaceId, taskBizLinks.bizId],
    references: [bizItems.workspaceId, bizItems.id],
  }),
}));

export const taskStepsRelations = relations(taskSteps, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [taskSteps.workspaceId],
    references: [workspaces.id],
  }),
  task: one(bprTasks, {
    fields: [taskSteps.workspaceId, taskSteps.taskId],
    references: [bprTasks.workspaceId, bprTasks.id],
  }),
}));

export const bizSysLinksRelations = relations(bizSysLinks, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [bizSysLinks.workspaceId],
    references: [workspaces.id],
  }),
  bizItem: one(bizItems, {
    fields: [bizSysLinks.workspaceId, bizSysLinks.bizId],
    references: [bizItems.workspaceId, bizItems.id],
  }),
  system: one(systems, {
    fields: [bizSysLinks.workspaceId, bizSysLinks.sysId],
    references: [systems.workspaceId, systems.id],
  }),
}));

export const contextNotesRelations = relations(contextNotes, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [contextNotes.workspaceId],
    references: [workspaces.id],
  }),
}));

export const managementPoliciesRelations = relations(
  managementPolicies,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [managementPolicies.workspaceId],
      references: [workspaces.id],
    }),
    taskLinks: many(policyTaskLinks),
    systemLinks: many(policySystemLinks),
  }),
);

export const policyTaskLinksRelations = relations(
  policyTaskLinks,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [policyTaskLinks.workspaceId],
      references: [workspaces.id],
    }),
    policy: one(managementPolicies, {
      fields: [policyTaskLinks.workspaceId, policyTaskLinks.policyId],
      references: [managementPolicies.workspaceId, managementPolicies.id],
    }),
    task: one(bprTasks, {
      fields: [policyTaskLinks.workspaceId, policyTaskLinks.taskId],
      references: [bprTasks.workspaceId, bprTasks.id],
    }),
  }),
);

export const policySystemLinksRelations = relations(
  policySystemLinks,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [policySystemLinks.workspaceId],
      references: [workspaces.id],
    }),
    policy: one(managementPolicies, {
      fields: [policySystemLinks.workspaceId, policySystemLinks.policyId],
      references: [managementPolicies.workspaceId, managementPolicies.id],
    }),
    system: one(systems, {
      fields: [policySystemLinks.workspaceId, policySystemLinks.systemId],
      references: [systems.workspaceId, systems.id],
    }),
  }),
);

// ===== 型エクスポート =====

export type Workspace = typeof workspaces.$inferSelect;
export type BprStage = typeof bprStages.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type BizItem = typeof bizItems.$inferSelect;
export type System = typeof systems.$inferSelect;
export type BprTask = typeof bprTasks.$inferSelect;
export type TaskStep = typeof taskSteps.$inferSelect;
export type BizSysLink = typeof bizSysLinks.$inferSelect;
export type TaskBizLink = typeof taskBizLinks.$inferSelect;
export type ContextNote = typeof contextNotes.$inferSelect;
export type ManagementPolicy = typeof managementPolicies.$inferSelect;
export type PolicyTaskLink = typeof policyTaskLinks.$inferSelect;
export type PolicySystemLink = typeof policySystemLinks.$inferSelect;
