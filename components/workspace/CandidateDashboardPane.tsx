"use client";

/**
 * Pane 3: 候補者ダッシュボード（ADR-0015 §19 で再設計）。
 *
 * 「人物軸の編集」として、ヘッダー帯（Collapsible）+ 採用条件カード + 選考フローカード
 * の 3 要素で構成。判断の 3 問い（Q1: 採る価値 / Q2: 採れるか / Q3: 手遅れか）に
 * スクロールなしで即答できることが目標。
 *
 * セクション順序: ヘッダー帯 → 採用条件 → 選考フロー
 */

import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Circle,
  CircleDot,
  Plus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  type Profile,
  type Scorecard,
  type SelectedDetail,
  type StageStatus,
  type System,
  type BprStage,
} from "@/lib/schema";
import { PANE3_SECTION, PANE4_SECTION_IDS } from "@/lib/labels";
import { selectableBprStagesForTask } from "@/lib/bpr-stages";
import {
  deriveStageStatus,
} from "@/lib/computed/scorecards";
import { calculateAge } from "@/lib/computed/profile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { SelectBprStageDialog } from "@/components/workspace/SelectBprStageDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  InlineTextField,
  InlineDateField,
  InlineComboboxField,
  InlineTextareaField,
  InlineFieldRow,
  SectionLabel,
  type ComboOption,
} from "@/components/primitives";
import { SystemIcon } from "@/components/primitives/SystemIcon";

// ===== ↗ ジャンプアイコン（ADR-0014 §4、常時表示） =====

function JumpIcon({
  selected,
  className,
}: {
  selected: boolean;
  className?: string;
}) {
  return (
    <ArrowUpRight
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0",
        selected ? "text-primary" : "text-muted-foreground",
        className,
      )}
    />
  );
}

// ===== ステージアイコン（状態軸、ADR-0014 §7） =====

function StageIcon({ status }: { status: StageStatus }) {
  if (status === "done") {
    return (
      <span
        className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        aria-label="完了"
      >
        <Check className="size-3" />
      </span>
    );
  }
  if (status === "planned") {
    return (
      <span
        className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground"
        aria-label="予定"
      >
        <CircleDot className="size-4" />
      </span>
    );
  }
  return (
    <span
      className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground"
      aria-label="未着手"
    >
      <Circle className="size-4" />
    </span>
  );
}

// ===== Card: 採用条件（ADR-0015 §19.4 追加決定 M） =====

function RecruitingConditionsCard({
  profile,
  setProfile,
}: {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
}) {
  const updateField = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle emphasis="prominent">
          {PANE3_SECTION.recruitingConditions}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-2.5 text-sm">
          <InlineFieldRow label="目標完了日">
            <InlineDateField
              value={profile.availableStartDate}
              onSave={(v) => updateField("availableStartDate", v)}
              ariaLabel="目標完了日"
            />
          </InlineFieldRow>
        </dl>
      </CardContent>
    </Card>
  );
}

// ===== Card: 選考フロー（ADR-0015 §19.5 担当者コメント統合版） =====

function ScreeningFlowListCard({
  scorecards,
  bprStages,
  selectedDetail,
  onOpenDetail,
  onAddStep,
}: {
  scorecards: Scorecard[];
  bprStages: BprStage[];
  selectedDetail: SelectedDetail;
  onOpenDetail: (next: SelectedDetail, scrollAnchor?: string) => void;
  onAddStep: (stage: Pick<BprStage, "id" | "name">) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const availableStages = selectableBprStagesForTask(
    bprStages,
    scorecards.map((s) => s.label),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle emphasis="prominent">
          {PANE3_SECTION.screeningFlow}
        </CardTitle>
        <CardDescription>
          {PANE3_SECTION.screeningFlowDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          {scorecards.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              進行ステージはまだありません。
            </p>
          ) : (
            scorecards.map((s, idx) => {
              const selected =
                selectedDetail?.type === "step" &&
                selectedDetail.stepId === s.id;
              const status = deriveStageStatus(s.date, s.decision);
              const showComment = status === "done" && !!s.comment;

              return (
                <div key={s.id}>
                  {idx > 0 && <Separator className="my-1" />}
                  <button
                    type="button"
                    onClick={() =>
                      onOpenDetail(
                        { type: "step", stepId: s.id },
                        PANE4_SECTION_IDS.m2.info,
                      )
                    }
                    aria-label={`Pane 4 で ${s.label} を開く`}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      selected
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted/40",
                    )}
                  >
                    <StageIcon status={status} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {s.label}
                        </span>
                        <div className="flex shrink-0 items-center gap-2">
                          {s.date && (
                            <span className="text-xs text-muted-foreground">
                              {s.date}
                            </span>
                          )}
                          {s.decision && (
                            <Badge variant="outline" size="xs">
                              {s.decision}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {s.interviewer || "未予定"}
                      </p>
                      {showComment && (
                        <p className="mt-0.5 line-clamp-2 border-l-2 border-primary/20 pl-2 text-xs leading-relaxed text-foreground/80">
                          &quot;{s.comment}&quot;
                        </p>
                      )}
                    </div>
                    <JumpIcon selected={selected} className="mt-0.5" />
                  </button>
                </div>
              );
            })
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => setAddOpen(true)}
            disabled={availableStages.length === 0}
          >
            <Plus />
            {PANE3_SECTION.addStepAction}
          </Button>
          {availableStages.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {PANE3_SECTION.addStepEmpty}
            </p>
          )}
        </div>
      </CardContent>

      <SelectBprStageDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title={PANE3_SECTION.addStepTitle}
        description={PANE3_SECTION.addStepDescription}
        fieldLabel={PANE3_SECTION.addStepFieldLabel}
        fieldId="bpr-stage-select"
        placeholder={PANE3_SECTION.addStepNoStages}
        emptyMessage={PANE3_SECTION.addStepEmpty}
        stages={availableStages}
        onSelect={(stage) => {
          onAddStep(stage);
          setAddOpen(false);
        }}
      />
    </Card>
  );
}

// ===== 業務ID（紐づき要チェック業務）の選択肢 =====

const INITIAL_SOURCE_OPTIONS: ComboOption[] = [
  { value: "b-license-saas",      description: "ライセンス管理SaaS化依頼（経理法務本部）" },
  { value: "b-md-royalty-retire", description: "MD印税見積システム廃止（事業開発本部）" },
];

// ===== Card: システム（タスク情報の直下） =====

function SystemsCard({ systems }: { systems: System[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle emphasis="prominent">{PANE3_SECTION.systems}</CardTitle>
      </CardHeader>
      <CardContent>
        {systems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            紐づくシステムはありません。
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {systems.map((system) => (
              <li key={system.id} className="flex items-center gap-3">
                <SystemIcon systems={[system]} size="list" />
                <span className="text-sm text-foreground">{system.name}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ===== Card: タスク情報（折りたたみ可能） =====

function ApplicationInfoCardContent({
  profile,
  setProfile,
}: {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
}) {
  const [sourceOptions, setSourceOptions] = useState<ComboOption[]>(
    INITIAL_SOURCE_OPTIONS,
  );

  const updateField = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const handleAddSource = (newOpt: ComboOption) =>
    setSourceOptions((prev) =>
      prev.find((o) => o.value === newOpt.value) ? prev : [...prev, newOpt],
    );

  return (
    <div className="flex flex-col">
      {/* 基本（タスク名 / 所属本部 / 業務ID / 主語） */}
      <section className="flex flex-col gap-3 pb-4">
        <dl className="flex flex-col gap-2.5 text-sm">
          <InlineFieldRow label="タスク名">
            <InlineTextField
              value={profile.name}
              onSave={(v) => updateField("name", v)}
              ariaLabel="タスク名"
            />
          </InlineFieldRow>
          <InlineFieldRow label="所属本部">
            <InlineTextField
              value={profile.address}
              onSave={(v) => updateField("address", v)}
              ariaLabel="所属本部"
            />
          </InlineFieldRow>
          <InlineFieldRow label="業務ID">
            <InlineComboboxField
              value={profile.source}
              options={sourceOptions}
              onSave={(v) => updateField("source", v)}
              onCreate={handleAddSource}
              ariaLabel="業務ID"
            />
          </InlineFieldRow>
          <InlineFieldRow label="主語（担当者）">
            <InlineTextField
              value={profile.recruiter}
              onSave={(v) => updateField("recruiter", v)}
              ariaLabel="主語（担当者）"
            />
          </InlineFieldRow>
        </dl>
      </section>

      <Separator />

      {/* 調査ログ・ヒアリング記録 */}
      <section className="flex flex-col gap-2 py-4">
        <SectionLabel>調査ログ・ヒアリング記録</SectionLabel>
        <InlineTextareaField
          value={profile.careerText}
          onSave={(v) => updateField("careerText", v)}
          ariaLabel="調査ログ・ヒアリング記録"
        />
      </section>

      <Separator />

      {/* タスクの背景・目的 */}
      <section className="flex flex-col gap-2 pt-4">
        <SectionLabel>タスクの背景・目的</SectionLabel>
        <InlineTextareaField
          value={profile.motivationFull}
          onSave={(v) => updateField("motivationFull", v)}
          ariaLabel="タスクの背景・目的"
        />
      </section>
    </div>
  );
}

function ApplicationInfoCard({
  profile,
  setProfile,
  open,
  onOpenChange,
  candidateKey,
}: {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateKey: string;
}) {
  return (
    <Card>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger
          nativeButton={false}
          render={
            <CardHeader className="group/trigger cursor-pointer rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
          }
        >
          <CardTitle emphasis="prominent">
            {PANE3_SECTION.applicationInfo}
          </CardTitle>
          <CardAction>
            <ChevronDown
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-[color,transform] group-hover/trigger:text-foreground in-data-[panel-open]:rotate-180"
            />
            <span className="sr-only">{`${PANE3_SECTION.applicationInfo}を開く`}</span>
          </CardAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <ApplicationInfoCardContent
              key={candidateKey}
              profile={profile}
              setProfile={setProfile}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ===== 候補者ヘッダー（固定。Avatar + 名前 + 年齢） =====

function CandidateHeader({ profile }: { profile: Profile }) {
  return (
    <div className="flex items-center gap-5">
      <Avatar className="size-16">
        <AvatarFallback className="border-[3px] border-foreground/50 bg-transparent text-xl font-bold text-foreground/80">
          {profile.name[0] ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="font-heading truncate text-xl font-semibold text-foreground">
          {profile.name || "タスク名未設定"}
        </h2>
        {profile.birthday && (
          <p className="text-sm text-muted-foreground">
            {calculateAge(profile.birthday)}
          </p>
        )}
      </div>
    </div>
  );
}

// ===== Pane 3 メイン =====

export function CandidateDashboardPane({
  profile,
  scorecards,
  bprStages,
  systems,
  selectedDetail,
  onOpenDetail,
  onAddStep,
  setProfile,
  applicationInfoOpen,
  onApplicationInfoOpenChange,
  selectedCandidateId,
}: {
  profile: Profile;
  scorecards: Scorecard[];
  bprStages: BprStage[];
  systems: System[];
  selectedDetail: SelectedDetail;
  onOpenDetail: (next: SelectedDetail, scrollAnchor?: string) => void;
  onAddStep: (stage: Pick<BprStage, "id" | "name">) => void;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  applicationInfoOpen: boolean;
  onApplicationInfoOpenChange: (open: boolean) => void;
  selectedCandidateId: string;
}) {
  return (
    <section className="min-w-0 flex-1 bg-canvas">
      <ScrollArea className="h-full">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-8 py-8">
          <CandidateHeader profile={profile} />

          <ApplicationInfoCard
            profile={profile}
            setProfile={setProfile}
            open={applicationInfoOpen}
            onOpenChange={onApplicationInfoOpenChange}
            candidateKey={selectedCandidateId}
          />

          <SystemsCard systems={systems} />

          <RecruitingConditionsCard profile={profile} setProfile={setProfile} />

          <ScreeningFlowListCard
            scorecards={scorecards}
            bprStages={bprStages}
            selectedDetail={selectedDetail}
            onOpenDetail={onOpenDetail}
            onAddStep={onAddStep}
          />
        </div>
      </ScrollArea>
    </section>
  );
}
