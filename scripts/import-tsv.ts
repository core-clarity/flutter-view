/**
 * TSV（データ検討シート）→ data/*.json 変換スクリプト。
 *
 * マッピング方針:
 *   - Pane 1: 本部 → BPRタスク名
 *   - Pane 2: TSV の「進行ステージ」を列として使用（固定6列は使わない）
 *   - タスクの stage = 進行中（最初の未完了）ステップに対応する進行ステージ列
 *
 * 使い方:
 *   npx tsx scripts/import-tsv.ts [tsv-path]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  NOT_STARTED_STAGE_NAME,
  NOT_STARTED_STAGE_SORT_ORDER,
} from "../lib/bpr-stages";

const DEFAULT_TSV = resolve(
  import.meta.dirname,
  "../data/データ検討 - 実務サンプル.tsv",
);

const OUT_DIR = resolve(import.meta.dirname, "../data");

const EMPTY_AXIS_SCORES = {
  achievements: null,
  thinkingAbility: null,
  communication: null,
  cultureFit: null,
} as const;

const NOT_STARTED_STAGE = {
  id: "stage-1",
  name: NOT_STARTED_STAGE_NAME,
} as const;

type SystemRow = {
  systemNumber: string;
  name: string;
  vendor: string;
  deptName: string;
  bprTasks: string[];
};

type TaskStepRow = {
  taskName: string;
  info: string;
  stageName: string;
};

function parseTsv(content: string): { systems: SystemRow[]; taskSteps: TaskStepRow[] } {
  const lines = content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  const systems: SystemRow[] = [];
  const taskSteps: TaskStepRow[] = [];
  let section: "systems" | "tasks" | null = null;

  for (const line of lines) {
    const cols = line.split("\t");
    const header = cols[0]?.trim();

    if (header === "システム番号") {
      section = "systems";
      continue;
    }
    if (header === "タスク") {
      section = "tasks";
      continue;
    }

    if (section === "systems") {
      const [systemNumber, name, vendor, deptName, ...taskCols] = cols;
      if (!name?.trim() || !deptName?.trim()) continue;

      systems.push({
        systemNumber: systemNumber?.trim() ?? "",
        name: name.trim(),
        vendor: vendor?.trim() ?? "",
        deptName: deptName.trim(),
        bprTasks: taskCols.map((t) => t.trim()).filter(Boolean),
      });
      continue;
    }

    if (section === "tasks") {
      const taskName = cols[0]?.trim();
      const stageName = cols[2]?.trim();
      if (!taskName || !stageName) continue;

      taskSteps.push({
        taskName,
        info: cols[1]?.trim() ?? "",
        stageName,
      });
    }
  }

  return { systems, taskSteps };
}

function groupTaskSteps(rows: TaskStepRow[]) {
  const grouped = new Map<string, { background: string; steps: string[] }>();

  for (const row of rows) {
    const existing = grouped.get(row.taskName);
    if (!existing) {
      grouped.set(row.taskName, {
        background: row.info,
        steps: [row.stageName],
      });
      continue;
    }
    if (row.info) existing.background = row.info;
    existing.steps.push(row.stageName);
  }

  return grouped;
}

function buildDeptTaskLinks(systems: SystemRow[]) {
  const links = new Map<string, Set<string>>();

  for (const sys of systems) {
    for (const taskName of sys.bprTasks) {
      const key = `${sys.deptName}\0${taskName}`;
      if (!links.has(key)) {
        links.set(key, new Set());
      }
      links.get(key)!.add(sys.name);
    }
  }

  return links;
}

function pickPrimaryDept(taskName: string, systems: SystemRow[]): string {
  const counts = new Map<string, number>();
  for (const sys of systems) {
    if (sys.bprTasks.includes(taskName)) {
      counts.set(sys.deptName, (counts.get(sys.deptName) ?? 0) + 1);
    }
  }
  let best = "";
  let bestCount = -1;
  for (const [dept, count] of counts) {
    if (count > bestCount) {
      best = dept;
      bestCount = count;
    }
  }
  return best;
}

function main() {
  const tsvPath = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_TSV;
  const content = readFileSync(tsvPath, "utf-8");
  const { systems, taskSteps } = parseTsv(content);
  const taskDetail = groupTaskSteps(taskSteps);
  const deptTaskLinks = buildDeptTaskLinks(systems);

  const deptNames = [...new Set(systems.map((s) => s.deptName))];
  const deptIds = new Map<string, string>();
  deptNames.forEach((name, i) => {
    deptIds.set(name, `dept-${i + 1}`);
  });

  const bizIdByDeptTask = new Map<string, string>();
  let bizCounter = 0;
  for (const deptName of deptNames) {
    const taskNames = [
      ...new Set(
        systems
          .filter((s) => s.deptName === deptName)
          .flatMap((s) => s.bprTasks),
      ),
    ];
    for (const taskName of taskNames) {
      bizCounter += 1;
      bizIdByDeptTask.set(`${deptName}\0${taskName}`, `biz-${bizCounter}`);
    }
  }

  const stageIds = new Map<string, string>();
  let nextRegularStageId = 2;
  const registerStageId = (name: string) => {
    if (stageIds.has(name)) return stageIds.get(name)!;
    const id =
      name === NOT_STARTED_STAGE.name
        ? NOT_STARTED_STAGE.id
        : `stage-${nextRegularStageId++}`;
    stageIds.set(name, id);
    return id;
  };

  const regularStageNames: string[] = [];
  const seenStageNames = new Set<string>();
  for (const row of taskSteps) {
    if (row.stageName === NOT_STARTED_STAGE.name) continue;
    if (seenStageNames.has(row.stageName)) continue;
    seenStageNames.add(row.stageName);
    regularStageNames.push(row.stageName);
    registerStageId(row.stageName);
  }
  registerStageId(NOT_STARTED_STAGE.name);

  const allTaskNames = [
    ...new Set([
      ...systems.flatMap((s) => s.bprTasks),
      ...taskDetail.keys(),
    ]),
  ].sort();

  const taskCurrentStageNames = new Map<string, string>();
  for (const taskName of allTaskNames) {
    const steps = taskDetail.get(taskName)?.steps ?? [];
    taskCurrentStageNames.set(
      taskName,
      steps.length > 0 ? steps[0]! : NOT_STARTED_STAGE.name,
    );
  }

  const bprStages = [
    ...regularStageNames.map((name, sortOrder) => ({
      id: stageIds.get(name)!,
      name,
      sortOrder,
    })),
    {
      id: NOT_STARTED_STAGE.id,
      name: NOT_STARTED_STAGE.name,
      sortOrder: NOT_STARTED_STAGE_SORT_ORDER,
    },
  ];

  const bizItems = deptNames.map((deptName) => ({
    id: deptIds.get(deptName)!,
    name: deptName,
    positions: [
      ...new Set(
        systems
          .filter((s) => s.deptName === deptName)
          .flatMap((s) => s.bprTasks),
      ),
    ].map((taskName) => ({
      id: bizIdByDeptTask.get(`${deptName}\0${taskName}`)!,
      name: taskName,
      count: 0,
      flags: [] as string[],
    })),
  }));

  const systemRows = systems.map((sys, i) => {
    const id =
      sys.systemNumber && sys.systemNumber !== "-"
        ? `sys-${sys.systemNumber}`
        : `sys-unassigned-${i + 1}`;
    return {
      id,
      name: sys.name,
      archType: "",
      mainDb: "",
      vendor: sys.vendor,
      contractStatus: "",
    };
  });

  const systemIdByName = new Map(systemRows.map((s) => [s.name, s.id]));

  const bizSysLinks: { bizId: string; sysId: string }[] = [];
  for (const [key] of deptTaskLinks) {
    const [deptName, taskName] = key.split("\0");
    const bizId = bizIdByDeptTask.get(key);
    if (!bizId) continue;

    for (const sys of systems) {
      if (sys.deptName === deptName && sys.bprTasks.includes(taskName)) {
        const sysId = systemIdByName.get(sys.name);
        if (sysId) {
          bizSysLinks.push({ bizId, sysId });
        }
      }
    }
  }

  const bprTasks = allTaskNames.map((taskName, i) => {
    const primaryDept = pickPrimaryDept(taskName, systems);
    const bizId = bizIdByDeptTask.get(`${primaryDept}\0${taskName}`) ?? "";
    const detail = taskDetail.get(taskName);
    const steps = detail?.steps ?? [];

    const currentStageName = taskCurrentStageNames.get(taskName)!;
    const stageId = stageIds.get(currentStageName)!;

    return {
      id: `task-${i + 1}`,
      profile: {
        name: taskName,
        birthday: "",
        source: bizId,
        email: "",
        phone: "",
        address: primaryDept,
        recruiter: "",
        desiredSalaryMin: "",
        desiredSalaryMax: "",
        availableStartDate: "",
        careerText: "",
        motivationFull: detail?.background ?? "",
      },
      scorecards: steps.map((stepName, stepIndex) => ({
        id: `task-${i + 1}-step-${stepIndex + 1}`,
        label: stepName,
        date: "",
        format: "",
        interviewer: "",
        axisScores: { ...EMPTY_AXIS_SCORES },
        materials: [],
      })),
      stage: stageId,
      archived: false,
      owner: "",
      bizId,
    };
  });

  const taskBizLinks: { taskId: string; bizId: string }[] = [];
  for (const task of bprTasks) {
    const taskName = task.profile.name;
    for (const [key, bizId] of bizIdByDeptTask) {
      const [, name] = key.split("\0");
      if (name === taskName) {
        taskBizLinks.push({ taskId: task.id, bizId });
      }
    }
  }

  for (const dept of bizItems) {
    for (const pos of dept.positions) {
      pos.count = taskBizLinks.filter((link) => link.bizId === pos.id).length;
    }
  }

  writeFileSync(
    resolve(OUT_DIR, "bprStages.json"),
    `${JSON.stringify(bprStages, null, 2)}\n`,
    "utf-8",
  );
  writeFileSync(
    resolve(OUT_DIR, "bizItems.json"),
    `${JSON.stringify(bizItems, null, 2)}\n`,
    "utf-8",
  );
  writeFileSync(
    resolve(OUT_DIR, "systems.json"),
    `${JSON.stringify(systemRows, null, 2)}\n`,
    "utf-8",
  );
  writeFileSync(
    resolve(OUT_DIR, "bizSysLinks.json"),
    `${JSON.stringify(bizSysLinks, null, 2)}\n`,
    "utf-8",
  );
  writeFileSync(
    resolve(OUT_DIR, "bprTasks.json"),
    `${JSON.stringify(bprTasks, null, 2)}\n`,
    "utf-8",
  );
  writeFileSync(
    resolve(OUT_DIR, "taskBizLinks.json"),
    `${JSON.stringify(taskBizLinks, null, 2)}\n`,
    "utf-8",
  );
  writeFileSync(
    resolve(OUT_DIR, "contextNotes.json"),
    "[]\n",
    "utf-8",
  );
  writeFileSync(
    resolve(OUT_DIR, "managementPolicies.json"),
    "[]\n",
    "utf-8",
  );

  console.log(`✅ Imported ${tsvPath}`);
  console.log(`   departments: ${bizItems.length}`);
  console.log(`   positions:   ${bizCounter}`);
  console.log(`   systems:     ${systemRows.length}`);
  console.log(`   bpr_stages:  ${bprStages.length}`);
  console.log(`   tasks:       ${bprTasks.length}`);
  console.log(`   task↔biz:    ${taskBizLinks.length}`);
}

main();
