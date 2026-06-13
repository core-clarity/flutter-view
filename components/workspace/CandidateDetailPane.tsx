"use client";

/**
 * Pane 4: 選考ステージ詳細パネル（ADR-0015 §19 でモード 1 を廃止）。
 *
 * ステージ詳細のみ表示する。候補者詳細（旧モード 1）は Pane 3 のヘッダー帯
 * トグル内に移管済み。起動時は畳まれた 48px 帯で、Pane 3 のステージカード
 * クリックで自動展開する。
 *
 * 規律:
 *   - components/primitives/ の Inline* primitive を使う（shadcn 標準フォーム）
 *   - AttachmentList を再利用（添付セクション）
 *   - ステージ切替時の state リセットは `key` 再マウントで
 *
 * `SelectedDetail` 型は `lib/schema.ts` に集約（Phase 3A）。
 */

import { useEffect, useState } from "react";

import { Ban, AlertTriangle, Scale, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { Pane4Toggle } from "@/components/workspace/Pane4Toggle";

import {
  type Scorecard,
  type SelectedDetail,
  type ContextNote,
  type Material,
} from "@/lib/schema";
import { PANE4_SECTION_IDS } from "@/lib/labels";
import { createMinimalScorecard } from "@/lib/data/factories";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  InlineDateField,
  InlineSelectField,
  InlineComboboxField,
  InlineTextareaField,
  InlineFieldRow,
  type ComboOption,
} from "@/components/primitives";
import { Pane4Section } from "@/components/workspace/Pane4Section";
import { MaterialList } from "@/components/workspace/MaterialList";

// ===== Pane 4 内部型（ファイル外には出さない） =====

/**
 * Pane 4 モード 2 で inline 編集できる Scorecard のキー集合。
 * `onUpdateScorecardField` の `field` 引数の型として親 (Workspace.tsx) と整合させる。
 *
 * 旧実装は `date / format / interviewer / decision` の 4 フィールドのみだったが、
 * ADR-0014 でコメント / 要約も `InlineTextareaField` で編集対象にしたため
 * `comment` / `summary` を追加した。Workspace.tsx 側の `EditableScorecardKey`
 * 再宣言も同形に揃える必要がある（型を export しない設計のため両側で宣言する規律）。
 */
type EditableScorecardKey =
  | "date"
  | "format"
  | "interviewer"
  | "decision"
  | "comment"
  | "summary";

// ===== 定数（BPR ドメイン） =====

const FORMAT_OPTIONS = [
  "対面",
  "オンライン（Teams/Meet）",
  "メール・チャット",
  "文書作業",
  "ワークショップ",
] as const;

const DECISION_OPTIONS = ["進行中", "完了", "保留", "差し戻し"] as const;

const INITIAL_INTERVIEWER_OPTIONS: ComboOption[] = [
  { value: "情シス（私）", description: "情報システム本部" },
  { value: "経理部マネージャ", description: "財務本部・経理部" },
  { value: "営業部マネージャ", description: "営業本部" },
  { value: "役員（承認待ち）", description: "経営層" },
  { value: "ベンダー", description: "外部システムベンダー" },
  { value: "外部コンサル", description: "BPR支援コンサルタント" },
];

// ===== 選考ステージ詳細（旧モード 2、ADR-0015 で唯一のモードに） =====

/**
 * モード 2（選考ステージ詳細、書類選考 / 面接 共通テンプレート）。
 * 基本情報 / コメント / 要約 / 添付 の 4 ブロック構成。
 *
 * ステージ別ラベル分岐（ADR-0010 §9 G）:
 *   - 「面接官」フィールド: 書類選考のみ「審査担当」、それ以外は「面接官」
 *   - 「要約」見出し: 書類選考のみ「書類の要約」、それ以外は「面接の要約」
 *   - 「添付」見出し: 書類選考のみ「提出書類」、それ以外は「添付」
 *
 * 各フィールドは `components/primitives/` の Inline* primitive で常時表示される
 * （Type-direct）。`interviewerOptions` は候補者+ステージ単位でメモリ保持し、
 * 親側 `key` でステージ・候補者切替時に自然リセット（Effect 内同期 setState 禁止）。
 */
function Mode2StageDetail({
  scorecard,
  onUpdateScorecardField,
  onUpdateMaterials,
}: {
  scorecard: Scorecard;
  onUpdateScorecardField: (
    stepId: string,
    field: EditableScorecardKey,
    value: string,
  ) => void;
  onUpdateMaterials: (stepId: string, materials: Material[]) => void;
}) {
  const summaryHeading = "記録サマリ";
  const materialHeading = "資料";

  const interviewerLabel = "担当者";

  const [interviewerOptions, setInterviewerOptions] = useState<ComboOption[]>(
    INITIAL_INTERVIEWER_OPTIONS,
  );

  const handleAddInterviewer = (newOpt: ComboOption) =>
    setInterviewerOptions((prev) =>
      prev.find((o) => o.value === newOpt.value) ? prev : [...prev, newOpt],
    );

  return (
    <div>
      {/* 基本情報（日時 / 形式 / 担当者 / ステータス） */}
      <Pane4Section id={PANE4_SECTION_IDS.m2.info} title="基本情報">
        <dl className="flex flex-col gap-2.5 text-sm">
          <InlineFieldRow label="日時">
            <InlineDateField
              value={scorecard.date}
              onSave={(v) => onUpdateScorecardField(scorecard.id, "date", v)}
              ariaLabel="日時"
            />
          </InlineFieldRow>

          <InlineFieldRow label="形式">
            <InlineSelectField
              value={scorecard.format}
              options={FORMAT_OPTIONS}
              onSave={(v) =>
                onUpdateScorecardField(scorecard.id, "format", v)
              }
              ariaLabel="形式"
            />
          </InlineFieldRow>

          <InlineFieldRow label={interviewerLabel}>
            <InlineComboboxField
              value={scorecard.interviewer}
              options={interviewerOptions}
              onSave={(v) =>
                onUpdateScorecardField(scorecard.id, "interviewer", v)
              }
              onCreate={handleAddInterviewer}
              ariaLabel={interviewerLabel}
            />
          </InlineFieldRow>

          <InlineFieldRow label="ステータス">
            <InlineSelectField
              value={scorecard.decision ?? ""}
              options={DECISION_OPTIONS}
              onSave={(v) =>
                onUpdateScorecardField(scorecard.id, "decision", v)
              }
              ariaLabel="ステータス"
            />
          </InlineFieldRow>
        </dl>
      </Pane4Section>

      <Separator />

      {/* メモ（textarea） */}
      <Pane4Section
        id={PANE4_SECTION_IDS.m2.comment}
        title="メモ"
        className="gap-2"
      >
        <InlineTextareaField
          value={scorecard.comment ?? ""}
          onSave={(v) => onUpdateScorecardField(scorecard.id, "comment", v)}
          ariaLabel="メモ"
        />
      </Pane4Section>

      <Separator />

      {/* 要約（書類選考: 書類の要約 / 面接: 面接の要約） */}
      <Pane4Section
        id={PANE4_SECTION_IDS.m2.summary}
        title={summaryHeading}
        className="gap-2"
      >
        <InlineTextareaField
          value={scorecard.summary ?? ""}
          onSave={(v) => onUpdateScorecardField(scorecard.id, "summary", v)}
          ariaLabel={summaryHeading}
        />
      </Pane4Section>

      <Separator />

      <Pane4Section
        id={PANE4_SECTION_IDS.m2.materials}
        title={materialHeading}
      >
        <MaterialList
          items={scorecard.materials}
          onChange={(materials) => onUpdateMaterials(scorecard.id, materials)}
        />
      </Pane4Section>
    </div>
  );
}

// ===== 空中視点メモカード =====

const NOTE_TYPE_CONFIG = {
  法令リスク:   { Icon: Scale,         border: "border-destructive/40",  bg: "bg-destructive/5",   badge: "bg-destructive/10 text-destructive border-destructive/30" },
  内部統制:     { Icon: ShieldAlert,    border: "border-amber-500/40",    bg: "bg-amber-500/5",     badge: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400" },
  業界慣行:     { Icon: AlertTriangle,  border: "border-yellow-500/40",   bg: "bg-yellow-500/5",    badge: "bg-yellow-400/10 text-yellow-700 border-yellow-400/30 dark:text-yellow-400" },
  ブラックリスト: { Icon: Ban,           border: "border-border",          bg: "bg-muted/40",        badge: "bg-muted text-muted-foreground border-border" },
} as const;

function ContextNoteCard({ note }: { note: ContextNote }) {
  const cfg = NOTE_TYPE_CONFIG[note.noteType];
  const { Icon } = cfg;
  return (
    <div className={cn("rounded-lg border p-3", cfg.border, cfg.bg)}>
      <div className="mb-1.5 flex items-start gap-2">
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none", cfg.badge)}>
          <Icon className="size-2.5" aria-hidden />
          {note.noteType}
        </span>
      </div>
      <p className="mb-1 text-xs font-semibold leading-snug text-foreground">
        {note.title}
      </p>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {note.body}
      </p>
    </div>
  );
}

// ===== Pane 4 メイン =====

/**
 * Pane 4: 選考ステージ詳細パネル（ADR-0015 §19 で候補者詳細を Pane 3 に移管）。
 *
 * - ヘッダー: ステージ名 + Pane4Toggle の 2 要素（◀ は撤廃）
 * - ステージ切替: `<Mode2StageDetail key={...}>` で再マウント
 * - ステージ未選択時（selectedDetail === null 想定、Phase 3C 暫定で type=profile も
 *   ステージなしとして扱う）: コンテンツなし、ヘッダーのみ
 */
export function CandidateDetailPane({
  selectedCandidateId,
  scorecards,
  selectedDetail,
  scrollAnchor,
  onScrollAnchorConsumed,
  onUpdateScorecardField,
  onUpdateMaterials,
  pane4Open,
  onTogglePane4,
  contextNotes,
}: {
  selectedCandidateId: string;
  scorecards: Scorecard[];
  selectedDetail: SelectedDetail;
  scrollAnchor: string | null;
  onScrollAnchorConsumed: () => void;
  onUpdateScorecardField: (
    stepId: string,
    field: EditableScorecardKey,
    value: string,
  ) => void;
  onUpdateMaterials: (stepId: string, materials: Material[]) => void;
  pane4Open: boolean;
  onTogglePane4: () => void;
  contextNotes: ContextNote[];
}) {
  useEffect(() => {
    if (!scrollAnchor) return;
    // 1 フレーム待つのは、Pane 4 が閉状態 → 開状態へ切り替わった直後に
    // 対象セクションの DOM がレイアウトされるのを待つため。
    // unmount された場合や anchor が変わった場合は cancel して、後続の
    // `scrollIntoView` と `onScrollAnchorConsumed`（state setter）が走らないようにする。
    const id = requestAnimationFrame(() => {
      document
        .getElementById(scrollAnchor)
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
      onScrollAnchorConsumed();
    });
    return () => cancelAnimationFrame(id);
  }, [scrollAnchor, onScrollAnchorConsumed]);

  const heading =
    selectedDetail?.type === "step"
      ? (scorecards.find((s) => s.id === selectedDetail.stepId)?.label ??
        "詳細")
      : "ステージ詳細";

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-l border-border bg-background",
        "overflow-hidden transition-[width] duration-200 ease-linear",
        pane4Open ? "w-[400px]" : "w-12",
      )}
    >
      {pane4Open ? (
        <>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
            <h2 className="flex-1 truncate text-sm font-semibold text-foreground">
              {heading}
            </h2>
            <Pane4Toggle open={pane4Open} onToggle={onTogglePane4} />
          </header>

          <ScrollArea className="min-h-0 flex-1">
            {selectedDetail?.type === "step" && (
              <Mode2StageDetail
                key={`${selectedCandidateId}-${selectedDetail.stepId}`}
                scorecard={
                  scorecards.find((s) => s.id === selectedDetail.stepId) ??
                  createMinimalScorecard(
                    selectedDetail.stepId,
                    "新しいステップ",
                  )
                }
                onUpdateScorecardField={onUpdateScorecardField}
                onUpdateMaterials={onUpdateMaterials}
              />
            )}
            {/* 空中視点メモ：このタスクに紐づくcontextNotesを表示 */}
            {(() => {
              const taskNotes = contextNotes.filter(
                (n) => n.refType === "task" && n.refId === selectedCandidateId,
              );
              if (taskNotes.length === 0) return null;
              return (
                <>
                  <Separator />
                  <div className="px-4 py-3">
                    <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      空中視点メモ
                    </p>
                    <div className="flex flex-col gap-2">
                      {taskNotes.map((note) => (
                        <ContextNoteCard key={note.id} note={note} />
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </ScrollArea>
        </>
      ) : (
        <div className="flex h-12 shrink-0 items-center justify-center border-b border-border">
          <Pane4Toggle open={pane4Open} onToggle={onTogglePane4} />
        </div>
      )}
    </aside>
  );
}
