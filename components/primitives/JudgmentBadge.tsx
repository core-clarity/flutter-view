/**
 * 判定バッジ。
 *
 * タスク行に表示する小さなインラインバッジ。
 * 判定の深刻度（level）で色が変わり、根拠源泉（source）がアイコン横に表示される。
 *
 * - critical（法令）  → 赤   Scale アイコン
 * - blocked（NG）     → 濃灰  Ban アイコン
 * - high（統制・経営）→ 橙   ShieldAlert / Target アイコン
 * - warning（慣行）  → 黄   AlertTriangle アイコン
 */

import { Ban, AlertTriangle, Scale, ShieldAlert, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Judgment } from "@/lib/schema";

type Props = {
  judgment: Judgment;
  /** タイトルをツールチップとして表示するか（デフォルト true） */
  showTooltip?: boolean;
};

const LEVEL_STYLES: Record<
  Judgment["level"],
  { container: string; icon: string }
> = {
  critical: {
    container:
      "bg-destructive/10 text-destructive border-destructive/20",
    icon: "text-destructive",
  },
  blocked: {
    container:
      "bg-muted text-muted-foreground border-border",
    icon: "text-muted-foreground",
  },
  high: {
    container:
      "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
    icon: "text-amber-600 dark:text-amber-400",
  },
  warning: {
    container:
      "bg-yellow-400/10 text-yellow-700 border-yellow-400/20 dark:text-yellow-400",
    icon: "text-yellow-600 dark:text-yellow-400",
  },
};

const SOURCE_ICONS: Record<Judgment["source"], React.ElementType> = {
  法令: Scale,
  統制: ShieldAlert,
  慣行: AlertTriangle,
  NG: Ban,
  経営: Target,
};

export function JudgmentBadge({ judgment, showTooltip = true }: Props) {
  const styles = LEVEL_STYLES[judgment.level];
  const Icon = SOURCE_ICONS[judgment.source];

  return (
    <span
      title={showTooltip ? judgment.title : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded border px-1 py-0.5",
        "text-[10px] font-medium leading-none",
        styles.container,
      )}
    >
      <Icon aria-hidden className={cn("size-2.5 shrink-0", styles.icon)} />
      {judgment.source}
    </span>
  );
}
