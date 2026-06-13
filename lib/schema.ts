/**
 * BPR ワークスペース（メタ認知〜主語が切り替わる世界〜）の Zod スキーマと派生型。
 * UI コンポーネントはここから型をインポートする。
 *
 * ドメインマッピング（道A踏襲ルート）:
 *   - Department   → 本部グループ（BizSection）
 *   - Position     → 要チェック業務（BizItem）
 *   - Candidate    → BPRタスク（BprTask）
 *   - StageKey     → BPR進行ステージ
 *   - Scorecard    → ステージ記録（将来 ContextNote に移行予定）
 */

import { z } from "zod";

// ===== Pane 1: 本部グループ → 要チェック業務 階層 =====

/** フラグ種別。要チェック業務に付与する問題の疑いの分類。 */
export const bizFlagSchema = z.enum([
  "重複の可能性",
  "無駄では？",
  "目的不明",
]);
export type BizFlag = z.infer<typeof bizFlagSchema>;

/** 要チェック業務（Pane 1 の階層 Sidebar に表示する単位）。 */
export const positionSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number(),
  /** 問題の疑いフラグ。省略時は空配列として扱う。 */
  flags: z.array(bizFlagSchema).default([]),
});
export type Position = z.infer<typeof positionSchema>;

/** 本部グループと配下の要チェック業務一覧。Pane 1 の最上位単位。 */
export const departmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  positions: z.array(positionSchema),
});
export type Department = z.infer<typeof departmentSchema>;

// ===== BPRタスク プロフィール =====

/**
 * BPRタスクの基本情報。
 *
 * フィールドの流用マッピング（道A 踏襲ルート）:
 *   name              → タスク名
 *   recruiter         → 主語（ボール持ち者）
 *   address           → 所属本部
 *   source            → 紐づき業務ID（bizId）
 *   motivationFull    → タスクの背景・目的メモ
 *   careerText        → ヒアリング経緯・調査ログ
 *   availableStartDate→ 目標完了日
 *   その他フィールド  → 将来の拡張用（現時点では空文字）
 */
export const profileSchema = z.object({
  name: z.string(),
  birthday: z.string(),
  source: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  recruiter: z.string(),
  desiredSalaryMin: z.string(),
  desiredSalaryMax: z.string(),
  availableStartDate: z.string(),
  careerText: z.string(),
  motivationFull: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;

// ===== 評価観点（4 軸固定）=====

export const axisKeySchema = z.enum([
  "achievements",
  "thinkingAbility",
  "communication",
  "cultureFit",
]);
export type AxisKey = z.infer<typeof axisKeySchema>;

export const axisScoresSchema = z.object({
  achievements: z.number().nullable(),
  thinkingAbility: z.number().nullable(),
  communication: z.number().nullable(),
  cultureFit: z.number().nullable(),
});
export type AxisScores = z.infer<typeof axisScoresSchema>;

export const AXIS_ORDER = axisKeySchema.options;

// ===== BPR 進行ステージ（Pane 2 列・ワークスペース単位で自由追加）=====

export const bprStageSchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number().default(0),
});
export type BprStage = z.infer<typeof bprStageSchema>;
export const bprStagesSchema = z.array(bprStageSchema);

/** @deprecated seed 互換用。新規コードは BprStage.id（string）を使う */
export const stageKeySchema = z.enum([
  "hearing",
  "flow",
  "issues",
  "meeting",
  "tobe",
  "poc",
]);
export type StageKey = z.infer<typeof stageKeySchema>;
export const STAGE_ORDER = stageKeySchema.options;

export const stageStatusSchema = z.enum(["done", "planned", "pending"]);
export type StageStatus = z.infer<typeof stageStatusSchema>;

/** 資料リンク（Google ドライブ等の URL） */
export const materialSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string(),
});
export type Material = z.infer<typeof materialSchema>;

/**
 * BPR 進行ステップ記録（1 タスク内の自由追加ステップ）。
 * Pane 3 一覧・Pane 4 詳細で使用。
 */
export const scorecardSchema = z.object({
  id: z.string(),
  label: z.string(),
  date: z.string(),
  format: z.string(),
  interviewer: z.string(),
  decision: z.string().optional(),
  comment: z.string().optional(),
  summary: z.string().optional(),
  axisScores: axisScoresSchema,
  materials: z.array(materialSchema).default([]),
});
export type Scorecard = z.infer<typeof scorecardSchema>;

// ===== BPRタスク =====

/**
 * BPRタスクの最上位データ（旧 Candidate）。
 * `stage` は Pane 2 の進行ステージ列 id（bpr_stages.id）。
 */
export const candidateSchema = z.object({
  id: z.string(),
  profile: profileSchema,
  scorecards: z.array(scorecardSchema),
  stage: z.string(),
  archived: z.boolean().default(false),
  owner: z.string().default(""),
  bizId: z.string().default(""),
});
export type Candidate = z.infer<typeof candidateSchema>;

// ===== JSON 全体用スキーマ =====

export const departmentsSchema = z.array(departmentSchema);
export const candidatesSchema = z.array(candidateSchema);
export const workspaceSchema = z.object({
  name: z.string(),
  icon: z.string(),
});

// ===== Pane 2: 業務システム =====

/** アーキテクチャ分類 */
export const archTypeSchema = z.enum([
  "オンプレミス",
  "クラウド SaaS",
  "クラウド PaaS",
  "ハイブリッド",
]);
export type ArchType = z.infer<typeof archTypeSchema>;

/** 業務システム（Pane 2 の選択候補） */
export const systemSchema = z.object({
  id: z.string(),
  name: z.string(),
  archType: z.string(),
  mainDb: z.string(),
  vendor: z.string(),
  contractStatus: z.string(),
});
export type System = z.infer<typeof systemSchema>;

export const systemsSchema = z.array(systemSchema);

// ===== n:m 紐づきテーブル =====

/** 要チェック業務 ↔ 業務システム の n:m リンク */
export const bizSysLinkSchema = z.object({
  bizId: z.string(),
  sysId: z.string(),
});
export type BizSysLink = z.infer<typeof bizSysLinkSchema>;

export const bizSysLinksSchema = z.array(bizSysLinkSchema);

// ===== Pane 4: 空中視点メモ =====

/** 空中視点メモの種別 */
export const contextNoteTypeSchema = z.enum([
  "法令リスク",
  "内部統制",
  "業界慣行",
  "ブラックリスト",
]);
export type ContextNoteType = z.infer<typeof contextNoteTypeSchema>;

/**
 * 空中視点メモ。法令・内部統制・業界慣行・過去の失敗事例の客観的根拠を記録する。
 * `refType` で task か system への紐づきを区別する。
 */
export const contextNoteSchema = z.object({
  id: z.string(),
  refType: z.enum(["task", "system"]),
  refId: z.string(),
  noteType: contextNoteTypeSchema,
  title: z.string(),
  body: z.string(),
});
export type ContextNote = z.infer<typeof contextNoteSchema>;

export const contextNotesSchema = z.array(contextNoteSchema);

// ===== Pane 4 の表示状態（SelectedDetail） =====

/**
 * Pane 4 に「何を開いているか」を表す型。
 * - `{ type: "step"; stepId }`: 進行ステップ詳細を表示中
 * - `null`: 未選択（Pane 4 は畳み状態）
 */
export type SelectedDetail = { type: "step"; stepId: string } | null;

// ===== 判定バッジ =====

/**
 * 判定の深刻度レベル。
 * critical > high > warning > blocked の順で表示優先度を持つ。
 */
export const judgmentLevelSchema = z.enum([
  "critical",
  "high",
  "warning",
  "blocked",
]);
export type JudgmentLevel = z.infer<typeof judgmentLevelSchema>;

/** 判定の根拠源泉ラベル。バッジに小さく表示する。 */
export const judgmentSourceSchema = z.enum([
  "法令",
  "統制",
  "慣行",
  "NG",
  "経営",
]);
export type JudgmentSource = z.infer<typeof judgmentSourceSchema>;

/** タスク行に表示する判定バッジ1件分。 */
export type Judgment = {
  level: JudgmentLevel;
  source: JudgmentSource;
  title: string;
};

// ===== 経営方針 =====

export const managementPolicySchema = z.object({
  id: z.string(),
  title: z.string(),
  priority: z.enum(["critical", "high"]),
  appliesTo: z.object({
    tasks: z.array(z.string()),
    systems: z.array(z.string()),
  }),
});
export type ManagementPolicy = z.infer<typeof managementPolicySchema>;
export const managementPoliciesSchema = z.array(managementPolicySchema);

// ===== Pane 2 の派生計算用 UI 表示型 =====

export type CandidateRow = {
  id: string;
  name: string;
  /** 判定バッジ一覧。深刻度の高い順に並ぶ。 */
  judgments: Judgment[];
  /** 紐づく業務システム（要チェック業務経由） */
  systems: System[];
};

export type Group =
  | { kind: "stage"; stageId: string; label: string; items: CandidateRow[] }
  | { kind: "archived"; label: string; items: CandidateRow[] };
