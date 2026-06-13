"use client";

import { type CSSProperties, type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { type CandidateRow, type StageKey } from "@/lib/schema";
import { JudgmentBadge } from "@/components/primitives/JudgmentBadge";
import { SystemIcon } from "@/components/primitives/SystemIcon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Pane 2 のステージグループ用、ドラッグ可能な候補者行。
 *
 * - 行全体クリック = 候補者を選択（onSelect 経由）
 * - 左端のグリップだけが drag listener を持つ。`MoreHorizontal` メニューや
 *   行クリックとは衝突しない（`activationConstraint: distance` でも吸収済み）
 * - DragOverlay 描画中は `isDragging` で半透明 + pointer-events 抑止
 *
 * archived グループの行はドラッグさせないため、本コンポーネントは stage グループ
 * 専用。archived は CandidateListPane 側の通常 `<li>` で描画する。
 */
export function SortableCandidateRow({
  cand,
  stage,
  selected,
  onSelect,
  actions,
}: {
  cand: CandidateRow;
  stage: StageKey;
  selected: boolean;
  onSelect: (id: string) => void;
  actions: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: cand.id,
    data: { containerId: stage, name: cand.name },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/candidate relative",
        isDragging && "pointer-events-none opacity-50",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(cand.id)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 text-left transition-colors",
          "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          selected
            ? "bg-accent text-accent-foreground"
            : "text-foreground hover:bg-muted",
        )}
      >
        <span
          {...attributes}
          {...listeners}
          aria-label={`${cand.name} の並び替え`}
          className={cn(
            "flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground",
            "opacity-0 transition-opacity group-focus-within/candidate:opacity-100 group-hover/candidate:opacity-100",
            "hover:text-foreground active:cursor-grabbing",
            "outline-none focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50",
          )}
          // ドラッグハンドルだけのクリックで選択動作が走らないようにする
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </span>
        <SystemIcon systems={cand.systems} size="row" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{cand.name}</p>
          {cand.judgments.length > 0 && (
            <span className="mt-0.5 flex flex-wrap gap-0.5">
              {cand.judgments.slice(0, 3).map((j, i) => (
                <JudgmentBadge key={i} judgment={j} />
              ))}
            </span>
          )}
        </div>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={cn(
                "absolute top-1/2 right-1 -translate-y-1/2",
                "opacity-0 group-focus-within/candidate:opacity-100 group-hover/candidate:opacity-100",
                "transition-opacity",
                "text-muted-foreground hover:text-foreground",
              )}
              aria-label={`${cand.name} の操作`}
            >
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuGroup>{actions}</DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
