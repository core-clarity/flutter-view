"use client";

import { useState } from "react";
import {
  ArchiveRestore,
  ChevronDown,
  MoreHorizontal,
  Plus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { type CandidateRow, type Group } from "@/lib/schema";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { CandidateRow as TaskRow } from "@/components/workspace/CandidateRow";
import { JudgmentBadge } from "@/components/primitives/JudgmentBadge";
import { SystemIcon } from "@/components/primitives/SystemIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";
import { PANE2_LABEL } from "@/lib/labels";

type CandidateListPaneProps = {
  groups: Group[];
  selectedCandidateId: string;
  onSelectCandidate: (id: string) => void;
  onAddCandidate: (stageId: string, name: string) => void;
  onAddStage: (name: string) => void;
  onArchiveCandidate: (id: string) => void;
  onRestoreCandidate: (id: string) => void;
};

export function CandidateListPane({
  groups,
  selectedCandidateId,
  onSelectCandidate,
  onAddCandidate,
  onAddStage,
  onArchiveCandidate,
  onRestoreCandidate,
}: CandidateListPaneProps) {
  const [addDialogStage, setAddDialogStage] = useState<{
    stageId: string;
    label: string;
  } | null>(null);
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const stageGroups = groups.filter(
    (g): g is Extract<Group, { kind: "stage" }> => g.kind === "stage",
  );
  const archivedGroup = groups.find(
    (g): g is Extract<Group, { kind: "archived" }> => g.kind === "archived",
  );

  return (
    <section className="flex w-[280px] shrink-0 flex-col border-r border-border bg-background">
      <header className="flex h-12 shrink-0 items-center border-b border-border px-3">
        <h2 className="truncate text-sm font-semibold text-foreground">
          {PANE2_LABEL.headerTitle}
        </h2>
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 px-3 py-4">
          {stageGroups.map((group) => (
            <StageGroup
              key={`stage:${group.stageId}`}
              stageId={group.stageId}
              label={group.label}
              items={group.items}
              selectedCandidateId={selectedCandidateId}
              onSelectCandidate={onSelectCandidate}
              onAddRequest={() =>
                setAddDialogStage({
                  stageId: group.stageId,
                  label: group.label,
                })
              }
              onArchiveRequest={(id, name) =>
                setArchiveTarget({ id, name })
              }
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setAddStageOpen(true)}
          >
            <Plus />
            {PANE2_LABEL.addStageAction}
          </Button>
          {archivedGroup && (
            <ArchivedGroup
              label={archivedGroup.label}
              items={archivedGroup.items}
              open={archivedOpen}
              onOpenChange={setArchivedOpen}
              selectedCandidateId={selectedCandidateId}
              onSelectCandidate={onSelectCandidate}
              onRestore={onRestoreCandidate}
            />
          )}
        </div>
      </ScrollArea>

      {addDialogStage && (
        <AddItemDialog
          open={addDialogStage !== null}
          onOpenChange={(open) => {
            if (!open) setAddDialogStage(null);
          }}
          title={PANE2_LABEL.addTaskTitle}
          description={PANE2_LABEL.addTaskDescription(addDialogStage.label)}
          fieldLabel={PANE2_LABEL.addTaskFieldLabel}
          fieldId="task-name"
          placeholder={PANE2_LABEL.addTaskPlaceholder}
          onAdd={(name) => onAddCandidate(addDialogStage.stageId, name)}
        />
      )}

      <AddItemDialog
        open={addStageOpen}
        onOpenChange={setAddStageOpen}
        title={PANE2_LABEL.addStageTitle}
        description={PANE2_LABEL.addStageDescription}
        fieldLabel={PANE2_LABEL.addStageFieldLabel}
        fieldId="stage-name"
        placeholder={PANE2_LABEL.addStagePlaceholder}
        onAdd={(name) => {
          onAddStage(name);
          setAddStageOpen(false);
        }}
      />

      <DeleteConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        title={PANE2_LABEL.archiveTitle}
        itemName={archiveTarget?.name ?? ""}
        description={PANE2_LABEL.archiveDescription(archiveTarget?.name ?? "")}
        actionLabel={PANE2_LABEL.archiveAction}
        onConfirm={() => {
          if (archiveTarget) {
            onArchiveCandidate(archiveTarget.id);
            setArchiveTarget(null);
          }
        }}
      />
    </section>
  );
}

function StageGroup({
  stageId,
  label,
  items,
  selectedCandidateId,
  onSelectCandidate,
  onAddRequest,
  onArchiveRequest,
}: {
  stageId: string;
  label: string;
  items: CandidateRow[];
  selectedCandidateId: string;
  onSelectCandidate: (id: string) => void;
  onAddRequest: () => void;
  onArchiveRequest: (id: string, name: string) => void;
}) {
  return (
    <div>
      <div className="sticky top-0 z-10 -mx-3 mb-2 flex items-center justify-between gap-2 bg-background px-5 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-xs font-medium text-muted-foreground">
            {label}
          </h3>
          <Badge variant="secondary" size="xs">
            {items.length}
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onAddRequest}
          aria-label={`${label} にタスクを追加`}
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
      <ul className="flex flex-col gap-1" data-stage={stageId}>
        {items.length === 0 ? (
          <li className="flex h-8 items-center justify-center rounded-md border border-dashed border-border/70 text-xs text-muted-foreground">
            {PANE2_LABEL.emptyStage}
          </li>
        ) : (
          items.map((cand) => (
            <TaskRow
              key={cand.id}
              cand={cand}
              selected={cand.id === selectedCandidateId}
              onSelect={onSelectCandidate}
              actions={
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => onArchiveRequest(cand.id, cand.name)}
                >
                  保留にする
                </DropdownMenuItem>
              }
            />
          ))
        )}
      </ul>
    </div>
  );
}

function ArchivedGroup({
  label,
  items,
  open,
  onOpenChange,
  selectedCandidateId,
  onSelectCandidate,
  onRestore,
}: {
  label: string;
  items: CandidateRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCandidateId: string;
  onSelectCandidate: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger
        nativeButton={false}
        render={
          <div
            className={cn(
              "group/archived-trigger sticky top-0 z-10 -mx-3 mb-2 flex cursor-pointer items-center justify-between gap-2 bg-background px-5 py-1.5",
              "rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            )}
          />
        }
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-xs font-medium text-muted-foreground">
            {label}
          </h3>
          <Badge variant="secondary" size="xs">
            {items.length}
          </Badge>
        </div>
        <ChevronDown
          aria-hidden="true"
          className="size-4 text-muted-foreground transition-[color,transform] group-hover/archived-trigger:text-foreground in-data-[panel-open]:rotate-180"
        />
        <span className="sr-only">{`${label}を開く`}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="flex flex-col gap-1" data-stage="archived">
          {items.map((cand) => (
            <ArchivedRowItem
              key={cand.id}
              cand={cand}
              selected={cand.id === selectedCandidateId}
              onSelect={onSelectCandidate}
              onRestore={onRestore}
            />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ArchivedRowItem({
  cand,
  selected,
  onSelect,
  onRestore,
}: {
  cand: CandidateRow;
  selected: boolean;
  onSelect: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  return (
    <li className="group/candidate relative">
      <button
        type="button"
        onClick={() => onSelect(cand.id)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors",
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
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => onRestore(cand.id)}>
              <ArchiveRestore />
              {PANE2_LABEL.restoreAction}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
