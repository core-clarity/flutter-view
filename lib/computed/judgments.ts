/**
 * 判定バッジの導出ロジック。
 *
 * タスクIDを受け取り、以下の2つのソースから Judgment[] を生成する:
 *   1. contextNotes（空中視点メモ）: noteType → level/source のマッピング
 *   2. managementPolicies（経営方針）: appliesTo.tasks にタスクIDが含まれる場合
 *
 * 同じ level が複数ある場合は重複排除せずに全件返す（どの根拠かを個別に表示するため）。
 * ただし呼び出し側で表示件数を制限してよい。
 */

import type {
  ContextNote,
  Judgment,
  JudgmentLevel,
  JudgmentSource,
  ManagementPolicy,
} from "@/lib/schema";

const NOTE_TYPE_MAP: Record<
  string,
  { level: JudgmentLevel; source: JudgmentSource }
> = {
  法令リスク: { level: "critical", source: "法令" },
  内部統制: { level: "high", source: "統制" },
  業界慣行: { level: "warning", source: "慣行" },
  ブラックリスト: { level: "blocked", source: "NG" },
};

const LEVEL_ORDER: JudgmentLevel[] = ["critical", "blocked", "high", "warning"];

export function deriveTaskJudgments(
  taskId: string,
  contextNotes: ContextNote[],
  policies: ManagementPolicy[],
): Judgment[] {
  const fromNotes: Judgment[] = contextNotes
    .filter((n) => n.refType === "task" && n.refId === taskId)
    .flatMap((n) => {
      const mapped = NOTE_TYPE_MAP[n.noteType];
      if (!mapped) return [];
      return [{ level: mapped.level, source: mapped.source, title: n.title }];
    });

  const fromPolicies: Judgment[] = policies
    .filter((p) => p.appliesTo.tasks.includes(taskId))
    .map((p) => ({
      level: p.priority as JudgmentLevel,
      source: "経営" as JudgmentSource,
      title: p.title,
    }));

  const all = [...fromNotes, ...fromPolicies];

  // 深刻度の高い順にソート
  return all.sort(
    (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level),
  );
}
