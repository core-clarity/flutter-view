import type { BizSysLink, System } from "@/lib/schema";

const CHART_COLOR_COUNT = 5;

/** システム id から安定した chart 色インデックス（0〜4）を返す */
export function getSystemColorIndex(systemId: string): number {
  let hash = 0;
  for (let i = 0; i < systemId.length; i++) {
    hash = (hash + systemId.charCodeAt(i)) % CHART_COLOR_COUNT;
  }
  return hash;
}

/** 半角英数字で始まる名前は先頭2文字、それ以外は先頭1文字 */
export function getSystemAbbrev(name: string): string {
  if (!name) return "?";
  if (/^[A-Za-z0-9]/.test(name)) {
    const match = name.match(/^[A-Za-z0-9]{1,2}/);
    return (match?.[0] ?? name[0]).toUpperCase();
  }
  return [...name][0] ?? "?";
}

/** 1〜20 は丸数字（⑥ 等）、それ以外は通常の数字 */
export function formatCircledCount(count: number): string {
  if (count >= 1 && count <= 20) {
    return String.fromCodePoint(0x2460 + count - 1);
  }
  return String(count);
}

/** 業務 ID ごとに紐づくシステム一覧を構築する */
export function buildBizSystemsMap(
  systems: System[],
  links: BizSysLink[],
): Map<string, System[]> {
  const byId = new Map(systems.map((s) => [s.id, s]));
  const map = new Map<string, System[]>();

  for (const link of links) {
    const sys = byId.get(link.sysId);
    if (!sys) continue;
    const existing = map.get(link.bizId) ?? [];
    if (!existing.some((s) => s.id === sys.id)) {
      map.set(link.bizId, [...existing, sys]);
    }
  }

  for (const [bizId, list] of map) {
    map.set(
      bizId,
      [...list].sort((a, b) => a.name.localeCompare(b.name, "ja")),
    );
  }

  return map;
}

/** タスクの業務 ID から紐づくシステム一覧を取得する */
export function resolveTaskSystems(
  bizId: string,
  bizSystemsMap: Map<string, System[]>,
): System[] {
  if (!bizId) return [];
  return bizSystemsMap.get(bizId) ?? [];
}
