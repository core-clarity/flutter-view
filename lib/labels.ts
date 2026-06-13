/**
 * BPR ワークスペース（メタ認知〜主語が切り替わる世界〜）の表示文言（labels）。
 *
 * 業種を変える受講生は、このファイルの値を業種に合わせて書き換える。
 */

import { type AxisKey, type StageKey } from "@/lib/schema";

// ===== 評価観点（4 軸固定）=====
// BPR では将来的にステージ評価へ置き換え予定。現時点は構造維持。

export const EVALUATION_AXIS: Record<AxisKey, string> = {
  achievements: "実績",
  thinkingAbility: "思考力",
  communication: "コミュニケーション",
  cultureFit: "カルチャーフィット",
} as const;

// ===== BPR 進行ステージ表示名 =====
// Pane 2 のグループ見出しに出すステージ表示名（日本語）。
// `Scorecard.label` とは独立に持つ（列としてのステージ名なので Record で固定）。

export const STAGE_LABELS: Record<StageKey, string> = {
  hearing: "ヒアリング",
  flow: "業務フロー作成",
  issues: "課題抽出",
  meeting: "要合意MTG",
  tobe: "To-Be策定",
  poc: "PoC",
};

// Pane 2 末尾の「保留・完了」グループの見出しラベル。
export const ARCHIVED_GROUP_LABEL = "保留・完了";

// ===== Pane 1 ラベル =====

export const PANE1_LABEL = {
  sectionTitle: "要チェック業務",
  addItemTitle: "業務を追加",
  addItemDescription: (deptName: string) => `${deptName} に要チェック業務を追加します`,
  addItemFieldLabel: "業務名",
  addItemPlaceholder: "例: 月次集計レポート作成",
  deleteItemTitle: "業務を削除しますか？",
} as const;

// ===== Pane 2 ラベル =====

export const PANE2_LABEL = {
  headerTitle: "BPR進行タスク",
  addTaskTitle: "タスクを追加",
  addTaskDescription: (stageLabel: string) =>
    `「${stageLabel}」ステージにタスクを追加します`,
  addTaskFieldLabel: "タスク名",
  addTaskPlaceholder: "例: 支払業務のヒアリング",
  archiveTitle: "タスクを保留にしますか？",
  archiveDescription: (name: string) =>
    `「${name}」を保留にします。後で「保留・完了」から復元できます。`,
  archiveAction: "保留にする",
  restoreAction: "復元",
  emptyStage: "タスクなし",
  addStageTitle: "進行ステージを追加",
  addStageDescription: "Pane 2 に表示する BPR 進行ステージを追加します",
  addStageFieldLabel: "ステージ名",
  addStagePlaceholder: "例: 要件定義",
  addStageAction: "進行ステージを追加",
} as const;

// ===== Pane 3 ダッシュボードのセクション見出し =====

export const PANE3_SECTION = {
  applicationInfo: "タスク情報",
  systems: "システム",
  recruitingConditions: "主語・担当者",
  screeningFlow: "BPR進行ステージ",
  screeningFlowDescription: "Pane 2 で定義した進行ステージから選択して追加します",
  addStepTitle: "進行ステージを追加",
  addStepDescription: "Pane 2 で定義済みの BPR 進行ステージから選択します",
  addStepFieldLabel: "進行ステージ",
  addStepAction: "進行ステージを追加",
  addStepEmpty: "追加できる進行ステージがありません。Pane 2 でステージを定義してください。",
  addStepNoStages: "選択できる進行ステージがありません",
} as const;

// ===== Pane 4 セクション id =====

export const PANE4_SECTION_IDS = {
  m2: {
    info: "pane4-m2-info",
    evaluation: "pane4-m2-evaluation",
    comment: "pane4-m2-comment",
    summary: "pane4-m2-summary",
    materials: "pane4-m2-materials",
  },
} as const;

// ===== 空中視点メモ 種別ラベル =====

export const CONTEXT_NOTE_TYPE_LABELS = {
  法令リスク: "法令リスク",
  内部統制: "内部統制",
  業界慣行: "業界慣行",
  ブラックリスト: "ブラックリスト",
} as const;

// ===== 主語（ボール持ち者）の選択肢 =====

export const OWNER_OPTIONS = [
  "情シス（私）",
  "経理部マネージャ",
  "営業部マネージャ",
  "役員（承認待ち）",
  "ベンダー",
  "外部コンサル",
] as const;
