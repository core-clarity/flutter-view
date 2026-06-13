"use client";

import { type ReactNode } from "react";
import { Archive, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { type CandidateRow } from "@/lib/schema";
import { JudgmentBadge } from "@/components/primitives/JudgmentBadge";
import { SystemIcon } from "@/components/primitives/SystemIcon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Pane 2 のタスク行（ドラッグなし） */
export function CandidateRow({
  cand,
  selected,
  onSelect,
  actions,
}: {
  cand: CandidateRow;
  selected: boolean;
  onSelect: (id: string) => void;
  actions: ReactNode;
}) {
  return (
    <li className="group/candidate relative">
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

export function ArchiveMenuItem({
  name,
  onArchive,
}: {
  name: string;
  onArchive: () => void;
}) {
  return (
    <DropdownMenuItem variant="destructive" onSelect={onArchive}>
      <Archive />
      {name} を保留にする
    </DropdownMenuItem>
  );
}
