import { describe, expect, it } from "vitest";

import {
  NOT_STARTED_STAGE_NAME,
  NOT_STARTED_STAGE_SORT_ORDER,
  compareBprStages,
  findBprStageByName,
  isNotStartedStage,
  nextBprStageSortOrder,
  selectableBprStagesForTask,
} from "@/lib/bpr-stages";

describe("bpr-stages", () => {
  it("未着手を常に最後尾に並べる", () => {
    const stages = [
      { name: NOT_STARTED_STAGE_NAME, sortOrder: 0 },
      { name: "ヒアリング", sortOrder: 1 },
      { name: "PoC", sortOrder: 2 },
    ];

    expect([...stages].sort(compareBprStages).map((s) => s.name)).toEqual([
      "ヒアリング",
      "PoC",
      NOT_STARTED_STAGE_NAME,
    ]);
  });

  it("未着手の sort_order は 99 固定", () => {
    expect(NOT_STARTED_STAGE_SORT_ORDER).toBe(99);
    expect(isNotStartedStage({ name: NOT_STARTED_STAGE_NAME })).toBe(true);
    expect(isNotStartedStage({ name: "ヒアリング" })).toBe(false);
  });

  it("新規ステージは未着手より手前の sort_order を得る", () => {
    const stages = [
      { name: "ヒアリング", sortOrder: 0 },
      { name: NOT_STARTED_STAGE_NAME, sortOrder: NOT_STARTED_STAGE_SORT_ORDER },
    ];

    expect(nextBprStageSortOrder(stages)).toBe(1);
  });

  it("Pane 3 で未着手と追加済みステージを除外する", () => {
    const stages = [
      { id: "s1", name: "ヒアリング", sortOrder: 0 },
      { id: "s2", name: NOT_STARTED_STAGE_NAME, sortOrder: 99 },
      { id: "s3", name: "PoC", sortOrder: 1 },
    ];

    expect(
      selectableBprStagesForTask(stages, ["ヒアリング"]).map((s) => s.name),
    ).toEqual(["PoC"]);
  });

  it("進行ステップ名から Pane 2 列を解決する", () => {
    const stages = [
      { id: "s1", name: "ユーザヒアリング（マネジメント）", sortOrder: 0 },
      { id: "s2", name: NOT_STARTED_STAGE_NAME, sortOrder: 99 },
    ];

    expect(
      findBprStageByName(stages, "ユーザヒアリング（マネジメント）")?.id,
    ).toBe("s1");
    expect(findBprStageByName(stages, "存在しない")).toBeUndefined();
  });
});
