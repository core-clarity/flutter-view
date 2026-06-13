import { type BprStage } from "@/lib/schema";

/** Pane 2 の末尾固定列「未着手」の表示名 */
export const NOT_STARTED_STAGE_NAME = "未着手" as const;

/** 未着手列の sort_order 固定値（他ステージ追加時も常に最後尾） */
export const NOT_STARTED_STAGE_SORT_ORDER = 99;

export function isNotStartedStage(stage: Pick<BprStage, "name">): boolean {
  return stage.name === NOT_STARTED_STAGE_NAME;
}

/** DB / クライアント双方で使う BPR 進行ステージの表示順 */
export function compareBprStages(
  a: Pick<BprStage, "name" | "sortOrder">,
  b: Pick<BprStage, "name" | "sortOrder">,
): number {
  const aNotStarted = isNotStartedStage(a);
  const bNotStarted = isNotStartedStage(b);
  if (aNotStarted && !bNotStarted) return 1;
  if (!aNotStarted && bNotStarted) return -1;
  return a.sortOrder - b.sortOrder;
}

/** 新規ステージ追加時の sort_order（未着手の 99 より手前） */
export function nextBprStageSortOrder(stages: Pick<BprStage, "name" | "sortOrder">[]): number {
  const maxRegular = stages
    .filter((s) => !isNotStartedStage(s))
    .reduce((max, s) => Math.max(max, s.sortOrder), -1);
  const next = maxRegular + 1;
  return next >= NOT_STARTED_STAGE_SORT_ORDER
    ? NOT_STARTED_STAGE_SORT_ORDER - 1
    : next;
}

/** Pane 3 でタスクに追加できる進行ステージ（未着手・追加済みを除外） */
export function selectableBprStagesForTask(
  stages: BprStage[],
  existingStepLabels: readonly string[],
): BprStage[] {
  const existing = new Set(existingStepLabels);
  return [...stages]
    .filter((s) => !isNotStartedStage(s) && !existing.has(s.name))
    .sort(compareBprStages);
}

/** 進行ステップ名（scorecard.label）に対応する Pane 2 列を返す */
export function findBprStageByName(
  stages: readonly BprStage[],
  stepLabel: string,
): BprStage | undefined {
  return stages.find((s) => s.name === stepLabel);
}
