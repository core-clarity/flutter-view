import { cn } from "@/lib/utils";
import type { System } from "@/lib/schema";
import {
  formatCircledCount,
  getSystemAbbrev,
  getSystemColorIndex,
} from "@/lib/computed/systems";

const SYSTEM_COLOR_STYLES = [
  { border: "border-chart-1", text: "text-chart-1" },
  { border: "border-chart-2", text: "text-chart-2" },
  { border: "border-chart-3", text: "text-chart-3" },
  { border: "border-chart-4", text: "text-chart-4" },
  { border: "border-chart-5", text: "text-chart-5" },
] as const;

type SystemIconSize = "row" | "mini" | "list";

function SingleSystemBadge({
  system,
  size,
}: {
  system: System;
  size: SystemIconSize;
}) {
  const abbrev = getSystemAbbrev(system.name);
  const color = SYSTEM_COLOR_STYLES[getSystemColorIndex(system.id)];
  const isTwoChar = abbrev.length > 1;

  const sizeClasses: Record<SystemIconSize, string> = {
    row: cn(
      "size-8 border-2",
      isTwoChar ? "text-[10px]" : "text-xs",
    ),
    mini: cn(
      "size-3.5 border",
      isTwoChar ? "text-[6px]" : "text-[7px]",
    ),
    list: cn(
      "size-6 border-2",
      isTwoChar ? "text-[9px]" : "text-[10px]",
    ),
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-transparent font-semibold leading-none",
        sizeClasses[size],
        color.border,
        color.text,
      )}
      aria-hidden="true"
    >
      {abbrev}
    </span>
  );
}

function SystemFolderIcon({
  systems,
  size,
}: {
  systems: System[];
  size: "row" | "list";
}) {
  const displaySystems = systems.slice(0, 4);
  const showCountBadge = systems.length >= 4;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-lg bg-muted/60",
        size === "row" ? "size-8 p-0.5" : "size-6 p-0.5",
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          "grid size-full gap-px",
          displaySystems.length <= 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2",
        )}
      >
        {displaySystems.map((system) => (
          <SingleSystemBadge key={system.id} system={system} size="mini" />
        ))}
      </span>
      {showCountBadge && (
        <span
          className={cn(
            "absolute -top-1 -right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-semibold leading-none text-primary-foreground",
          )}
          aria-label={`${systems.length} システム`}
        >
          {formatCircledCount(systems.length)}
        </span>
      )}
    </span>
  );
}

type SystemIconProps = {
  systems: System[];
  /** row: Pane 2 行アイコン / list: Pane 3 一覧の左アイコン */
  size?: "row" | "list";
  className?: string;
};

/** 業務システム名の先頭文字を色付きサークルで表示するアイコン */
export function SystemIcon({
  systems,
  size = "row",
  className,
}: SystemIconProps) {
  if (systems.length === 0) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 bg-transparent text-xs font-semibold text-muted-foreground",
          size === "row" ? "size-8" : "size-6",
          className,
        )}
        aria-hidden="true"
      >
        —
      </span>
    );
  }

  if (systems.length === 1) {
    return (
      <span className={cn("inline-flex shrink-0", className)}>
        <SingleSystemBadge system={systems[0]} size={size} />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex shrink-0", className)}>
      <SystemFolderIcon systems={systems} size={size} />
    </span>
  );
}
