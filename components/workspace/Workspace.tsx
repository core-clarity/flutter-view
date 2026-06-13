"use client";

/**
 * Workspace: 4 ペインの親コンポーネント。
 *
 * - Pane 1〜4 の state（candidates / selectedCandidateId / selectedDetail）を
 *   保持し、各ペインに props として渡す。
 *   `previousDetail` state は ADR-0011 §6 大決定 D で削除した（戻り先が候詳に固定
 *   されたため、直前の詳細を 1 段階覚える概念が不要になった）。
 * - Pane 3 = 候補者ダッシュボード（人物軸の編集: ヘッダー帯 + 採用条件 + 選考フロー）
 * - Pane 4 = ステージ軸の編集（選考ステージ詳細のみ）
 *   ADR-0015 §9 大決定 G により、Pane 4 のデフォルト state は `null`
 *   （ステージ未選択 = 畳み状態）。◀ ボタンは撤廃。
 *
 * レイアウト構造（shadcn/ui Sidebar を採用、ADR-0006 §3/§5 を本実装で改訂）:
 *
 * ```
 * <SidebarProvider> (h-screen, defaultOpen, Cmd+B でトグル)
 * ┌─ Sidebar (Pane 1) ─┬─ SidebarInset ─────────────────────┐
 * │ (画面最上端          │ ┌─ GlobalHeader (h-12) ─────────┐ │
 * │  〜最下端)           │ └─────────────────────────────────┘ │
 * │ collapsible="icon"  │ ┌─ Pane 2 ─┬─ Pane 3 ─┬─ Pane 4 ─┐ │
 * │ 240px ↔ 48px        │ │          │          │          │ │
 * └────────────────────┴─┴──────────┴──────────┴──────────┘
 * ```
 *
 * - Pane 1 のみ画面最上端〜最下端まで届く chrome（折りたたみ可）
 * - GlobalHeader は Pane 1 を除く右側全幅（Pane 2 / Pane 3 / Pane 4 の上）に渡る
 * - Pane 4 はヘッダー直下から最下端まで
 * - Pane 1 折りたたみトグルは Pane 1 ヘッダー右端の `Pane1Toggle` 1 箇所
 *   （ADR-0006 §5 で計画していた GlobalHeader 側の SidebarTrigger は本実装で撤回）
 *
 * 仕様の出典:
 *   - openspec/decision/0006-pane-background-hierarchy-and-shadcn-inset-header.md
 *     §2（4 段階背景色階層）/ §4（保存ステータス削除）はそのまま採用
 *     §3（Pane 4 = 画面最上端〜最下端 / ヘッダーは中央エリアのみ）は本実装で再改訂
 *     §5（SidebarTrigger は GlobalHeader）も本実装で再改訂（Pane 1 ヘッダー側に集約）
 *   - openspec/decision/0009-drilldown-card-affordance.md（Pane 3 ドリルダウンカードの ▶ 規律）
 *   - openspec/changes/add-4pane-workspace-template/specs/workspace-template/spec.md
 *   - openspec/changes/add-4pane-workspace-template/design.md D51〜D56 / D65
 */

import { useState, useCallback, useMemo } from "react";

import {
  addBprStage,
  addBprTask,
  addTaskStep,
  saveStepField,
  saveStepMaterials,
  saveTaskArchived,
  saveTaskProfileField,
  saveTaskStage,
} from "@/app/actions/workspace-data";
import {
  compareBprStages,
  findBprStageByName,
  nextBprStageSortOrder,
} from "@/lib/bpr-stages";
import {
  type Profile,
  type Department,
  type Candidate,
  type BprStage,
  type Group,
  type SelectedDetail,
  type ContextNote,
  type ManagementPolicy,
  type Material,
  type System,
  type BizSysLink,
} from "@/lib/schema";
import { deriveTaskJudgments } from "@/lib/computed/judgments";
import {
  buildBizSystemsMap,
  resolveTaskSystems,
} from "@/lib/computed/systems";
import {
  createMinimalProfile,
  createMinimalScorecard,
} from "@/lib/data/factories";
import { ARCHIVED_GROUP_LABEL } from "@/lib/labels";

const PERSISTED_PROFILE_FIELDS = [
  "name",
  "address",
  "source",
  "recruiter",
  "careerText",
  "motivationFull",
  "availableStartDate",
] as const satisfies readonly (keyof Profile)[];
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { GlobalHeader } from "@/components/workspace/GlobalHeader";
import { PositionPane } from "@/components/workspace/PositionPane";
import { CandidateListPane } from "@/components/workspace/CandidateListPane";
import { CandidateDashboardPane } from "@/components/workspace/CandidateDashboardPane";
import { CandidateDetailPane } from "@/components/workspace/CandidateDetailPane";

// ========== UI 内部型 ==========
//
// 種データは `data/*.json` → Server Component（app/page.tsx）で Zod parse → props で受け取る。
// ヘルパー関数（createMinimalProfile / createMinimalScorecard）は `lib/data/factories.ts`。
// Pane 2 の表示用派生型 (CandidateRow / Group) と `SelectedDetail` 型は
// `lib/schema.ts` に集約（複数ペインで共有するため）。
// Pane 4 モード 2 用の `EditableScorecardKey` は
// `components/workspace/CandidateDetailPane.tsx` 内部の閉じた型。

// `updateScorecardField` の field 引数で使う key の union 型。Pane 4 内部の
// `EditableScorecardKey` と同形。CandidateDetailPane 内部に閉じた型として扱い
// たいため export せず、親側で同じ形を再宣言して持つ。
//
// ADR-0014「shadcn 標準フォームによる Pane 4 編集 UI」で `comment` / `summary`
// を `InlineTextareaField` で編集対象に追加したため、旧 4 フィールドから 6 フィールド
// に拡張。CandidateDetailPane.tsx 側の同型宣言（line 70-76）と同期させる。
// `onUpdateScorecardField` 実装本体は `[field]: value` のスプレッドで
// 動作するため、ロジックの追加修正は不要。
type EditableScorecardKey =
  | "date"
  | "format"
  | "interviewer"
  | "decision"
  | "comment"
  | "summary";

type WorkspaceProps = {
  initialDepartments: Department[];
  initialCandidates: Candidate[];
  initialBprStages: BprStage[];
  workspace: { name: string; icon: string };
  contextNotes: ContextNote[];
  managementPolicies: ManagementPolicy[];
  systems: System[];
  bizSysLinks: BizSysLink[];
};

export function Workspace({
  initialDepartments,
  initialCandidates,
  initialBprStages,
  workspace,
  contextNotes,
  managementPolicies,
  systems,
  bizSysLinks,
}: WorkspaceProps) {
  const [departments, setDepartments] =
    useState<Department[]>(initialDepartments);
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [bprStages, setBprStages] = useState<BprStage[]>(initialBprStages);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    initialCandidates[0]?.id ?? "",
  );
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetail>(null);
  const [scrollAnchor, setScrollAnchor] = useState<string | null>(null);
  // ユーザーが手動で Pane 4 を畳んだか。ステージ選択は保持しつつ畳む用途。
  const [pane4ManuallyClosed, setPane4ManuallyClosed] = useState(false);
  // Pane 3 ヘッダー帯（Collapsible）の開閉。候補者切替で閉じ、新規追加で開く。
  const [applicationInfoOpen, setApplicationInfoOpen] = useState(false);

  // Pane 4 の展開状態を派生計算（ADR-0015 §9 大決定 G）。
  // selectedDetail !== null かつ手動で畳んでいない → 開いている。
  const pane4Open = selectedDetail !== null && !pane4ManuallyClosed;

  // アクティブ候補者を取得。`INITIAL_CANDIDATES` が常に最低 1 名持つ前提だが、
  // 万一 find が undefined を返す（未来に candidates の削除機能が入った場合等）
  // ケースに備えて先頭候補者にフォールバックする。
  const activeCandidate =
    candidates.find((c) => c.id === selectedCandidateId) ?? candidates[0];
  const profile = activeCandidate.profile;
  const scorecards = activeCandidate.scorecards;

  // Mode1ProfileDetail は `setProfile: React.Dispatch<React.SetStateAction<Profile>>`
  // を期待している（採用案 X）。子コンポーネント側の signature を変えないために、
  // candidates 配列を更新するアダプタをここで作る。
  // 関数形 (p => next) と値形 (next) の両方に対応する。
  const setProfile = useCallback<React.Dispatch<React.SetStateAction<Profile>>>(
    (action) => {
      setCandidates((prev) =>
        prev.map((c) => {
          if (c.id !== selectedCandidateId) return c;
          const prevProfile = c.profile;
          const next =
            typeof action === "function" ? action(c.profile) : action;

          for (const key of PERSISTED_PROFILE_FIELDS) {
            if (prevProfile[key] !== next[key]) {
              void saveTaskProfileField(selectedCandidateId, key, next[key]);
            }
          }

          return {
            ...c,
            profile: next,
            owner: next.recruiter,
            bizId: next.source,
          };
        }),
      );
    },
    [selectedCandidateId],
  );

  const openDetail = useCallback(
    (next: SelectedDetail, anchor?: string) => {
      if (next?.type === "step") {
        setCandidates((prev) =>
          prev.map((c) => {
            if (c.id !== selectedCandidateId) return c;

            const existingStep = c.scorecards.find((s) => s.id === next.stepId);
            const scorecards = existingStep
              ? c.scorecards
              : [
                  ...c.scorecards,
                  createMinimalScorecard(next.stepId, "新しいステップ"),
                ];
            const stepLabel = existingStep?.label ?? "新しいステップ";
            const matchedStage = findBprStageByName(bprStages, stepLabel);

            if (matchedStage && c.stage !== matchedStage.id) {
              void saveTaskStage(c.id, matchedStage.id, next.stepId);
              return { ...c, scorecards, stage: matchedStage.id };
            }

            if (!existingStep) {
              return { ...c, scorecards };
            }
            return c;
          }),
        );
      }
      setSelectedDetail(next);
      setScrollAnchor(anchor ?? null);
      setPane4ManuallyClosed(false);
    },
    [selectedCandidateId, bprStages],
  );

  // Pane 2 の候補者行クリックでアクティブ候補者を切り替える。
  // - selectedDetail が「ステージ詳細」だった場合、新候補者にそのステージの
  //   scorecard が無ければ Pane 4 を **候補者詳細にフォールバック**する
  //   （ADR-0011 §7 大決定 E、旧 null フォールバックを撤回）。c2 以外は
  //   scorecards: [] のため、c2 → 別候補者の切替時はほぼ常に候詳へフォールバック。
  // - selectedDetail が「候補者詳細」のときは維持してよい（profile はどの候補者にも
  //   必ず存在する）。
  // - previousDetail state は ADR-0011 §6 大決定 D で削除済みのため、リセット不要。
  const selectCandidate = useCallback((id: string) => {
    setSelectedCandidateId(id);
    setSelectedDetail(null);
    setApplicationInfoOpen(false);
    setPane4ManuallyClosed(false);
  }, []);

  const addCandidate = useCallback(async (stageId: string, name: string) => {
    const { id: newId, bizId } = await addBprTask(stageId, name);
    const newCandidate: Candidate = {
      id: newId,
      profile: { ...createMinimalProfile(name), source: bizId },
      scorecards: [],
      stage: stageId,
      archived: false,
      owner: "",
      bizId,
    };
    setCandidates((prev) => [...prev, newCandidate]);
    setSelectedCandidateId(newId);
    setSelectedDetail(null);
    setApplicationInfoOpen(true);
    setPane4ManuallyClosed(false);
  }, []);

  const handleAddStage = useCallback(async (name: string) => {
    const id = await addBprStage(name);
    setBprStages((prev) =>
      [...prev, { id, name, sortOrder: nextBprStageSortOrder(prev) }].sort(
        compareBprStages,
      ),
    );
  }, []);

  const handleAddStep = useCallback(
    async (stage: Pick<BprStage, "id" | "name">) => {
      const stepId = await addTaskStep(
        selectedCandidateId,
        stage.name,
        stage.id,
      );
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === selectedCandidateId
            ? {
                ...c,
                stage: stage.id,
                scorecards: [
                  ...c.scorecards,
                  createMinimalScorecard(stepId, stage.name),
                ],
              }
            : c,
        ),
      );
      openDetail({ type: "step", stepId });
    },
    [selectedCandidateId, openDetail],
  );

  // 候補者をアーカイブ（論理削除）する。データは残し `archived: true` を立てる。
  // 復元は `restoreCandidate` から、もしくは Pane 2「アーカイブ済み」グループの
  // 「復元」ボタン経由。アクティブ候補者をアーカイブした場合は、非 archived の
  // 先頭候補者にフォールバックし、ステージ詳細（Pane 4）はクリアする。
  const archiveCandidate = useCallback((id: string) => {
    void saveTaskArchived(id, true);
    setCandidates((prev) => {
      const next = prev.map((c) =>
        c.id === id ? { ...c, archived: true } : c,
      );
      setSelectedCandidateId((prevId) => {
        if (prevId !== id) return prevId;
        const fallback = next.find((c) => !c.archived);
        return fallback ? fallback.id : "";
      });
      return next;
    });
    setSelectedDetail(null);
    setPane4ManuallyClosed(false);
  }, []);

  // アーカイブ済み候補者を元のステージに復元する。`stage` は archived 中も保持
  // しているので、そのステージへ戻すだけでよい。
  const restoreCandidate = useCallback((id: string) => {
    void saveTaskArchived(id, false);
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, archived: false } : c)),
    );
  }, []);

  const updateScorecardField = useCallback(
    (stepId: string, field: EditableScorecardKey, value: string) => {
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === selectedCandidateId
            ? {
                ...c,
                scorecards: c.scorecards.map((s) => {
                  if (s.id !== stepId) return s;
                  if (field === "decision") {
                    const trimmed = value.trim();
                    return {
                      ...s,
                      decision: trimmed === "" ? undefined : trimmed,
                    };
                  }
                  return { ...s, [field]: value };
                }),
              }
            : c,
        ),
      );

      const dbField =
        field === "decision" ? "decision" : (field as Parameters<typeof saveStepField>[1]);
      void saveStepField(stepId, dbField, value);
    },
    [selectedCandidateId],
  );

  const updateMaterials = useCallback(
    (stepId: string, materials: Material[]) => {
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === selectedCandidateId
            ? {
                ...c,
                scorecards: c.scorecards.map((s) =>
                  s.id === stepId ? { ...s, materials } : s,
                ),
              }
            : c,
        ),
      );
      void saveStepMaterials(stepId, materials);
    },
    [selectedCandidateId],
  );

  const addDepartment = useCallback((name: string) => {
    setDepartments((prev) => [
      ...prev,
      { id: `d-${Date.now()}`, name, positions: [] },
    ]);
  }, []);

  const deleteDepartment = useCallback((deptId: string) => {
    setDepartments((prev) => prev.filter((d) => d.id !== deptId));
  }, []);

  const addPosition = useCallback((deptId: string, posName: string) => {
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === deptId
          ? {
              ...d,
              positions: [
                ...d.positions,
                { id: `p-${Date.now()}`, name: posName, count: 0, flags: [] },
              ],
            }
          : d,
      ),
    );
  }, []);

  const deletePosition = useCallback((deptId: string, posId: string) => {
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === deptId
          ? { ...d, positions: d.positions.filter((p) => p.id !== posId) }
          : d,
      ),
    );
  }, []);

  // Pane 4 内の `useEffect` 依存安定化のため、Workspace 側でメモ化して props で渡す。
  const consumeScrollAnchor = useCallback(() => setScrollAnchor(null), []);
  const togglePane4 = useCallback(() => setPane4ManuallyClosed((v) => !v), []);

  const positionTitle = profile.address || "要チェック業務";
  const departmentTitle = "BPR進行タスク";

  const bizSystemsMap = useMemo(
    () => buildBizSystemsMap(systems, bizSysLinks),
    [systems, bizSysLinks],
  );

  const activeTaskSystems = useMemo(
    () => resolveTaskSystems(activeCandidate.bizId, bizSystemsMap),
    [activeCandidate.bizId, bizSystemsMap],
  );

  const candidateGroups: Group[] = useMemo(() => {
    const toRow = (c: Candidate) => ({
      id: c.id,
      name: c.profile.name,
      judgments: deriveTaskJudgments(c.id, contextNotes, managementPolicies),
      systems: resolveTaskSystems(c.bizId, bizSystemsMap),
    });

    const stageGroups: Group[] = bprStages.map((stage) => ({
      kind: "stage" as const,
      stageId: stage.id,
      label: stage.name,
      items: candidates
        .filter((c) => !c.archived && c.stage === stage.id)
        .map(toRow),
    }));

    const archivedItems = candidates.filter((c) => c.archived).map(toRow);

    if (archivedItems.length === 0) return stageGroups;
    return [
      ...stageGroups,
      { kind: "archived" as const, label: ARCHIVED_GROUP_LABEL, items: archivedItems },
    ];
  }, [bprStages, candidates, contextNotes, managementPolicies, bizSystemsMap]);

  return (
    // shadcn/ui の SidebarProvider が外側を取り、Pane 1 (`<Sidebar>`) を全高で固定
    // 表示する。SidebarInset が右側ブロック（GlobalHeader + Pane 2/3/4）を担う。
    // Cmd+B のキーバインドは SidebarProvider 側で標準実装されている。
    // SidebarProvider のラッパー div は既定 `min-h-svh w-full`。雛形では
    // ビューポート高に固定したいので h-screen を併記し、ペイン内で min-h-0 が
    // 効くようにする（既存 ScrollArea の挙動と整合）。
    <SidebarProvider
      defaultOpen
      className="h-screen w-full overflow-hidden bg-background text-foreground"
    >
      <PositionPane
        workspaceName={workspace.name}
        departments={departments}
        selectedPositionName={positionTitle}
        onAddPosition={addPosition}
        onDeletePosition={deletePosition}
      />
      <SidebarInset className="flex min-w-0 flex-col bg-background">
        <GlobalHeader
          departmentTitle={departmentTitle}
          positionTitle={positionTitle}
          candidateName={profile.name}
          departments={departments}
          onAddDepartment={addDepartment}
          onDeleteDepartment={deleteDepartment}
        />
        {/* SidebarInset 自体が <main> を出すので、内側は <div> で組み、
            Pane 2 / Pane 3 / Pane 4 を横並びにする。 */}
        <div className="flex min-h-0 flex-1">
          <CandidateListPane
            groups={candidateGroups}
            selectedCandidateId={selectedCandidateId}
            onSelectCandidate={selectCandidate}
            onAddCandidate={addCandidate}
            onAddStage={handleAddStage}
            onArchiveCandidate={archiveCandidate}
            onRestoreCandidate={restoreCandidate}
          />
          <CandidateDashboardPane
            profile={profile}
            scorecards={scorecards}
            bprStages={bprStages}
            systems={activeTaskSystems}
            selectedDetail={selectedDetail}
            onOpenDetail={openDetail}
            onAddStep={handleAddStep}
            setProfile={setProfile}
            applicationInfoOpen={applicationInfoOpen}
            onApplicationInfoOpenChange={setApplicationInfoOpen}
            selectedCandidateId={selectedCandidateId}
          />
          <CandidateDetailPane
            selectedCandidateId={selectedCandidateId}
            scorecards={scorecards}
            selectedDetail={selectedDetail}
            scrollAnchor={scrollAnchor}
            onScrollAnchorConsumed={consumeScrollAnchor}
            onUpdateScorecardField={updateScorecardField}
            onUpdateMaterials={updateMaterials}
            pane4Open={pane4Open}
            onTogglePane4={togglePane4}
            contextNotes={contextNotes}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
