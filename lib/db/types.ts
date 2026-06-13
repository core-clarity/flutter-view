/**
 * JSONB 列に格納する値の型定義。
 * Drizzle の $type<>() と Zod スキーマ（lib/schema.ts）の橋渡し用。
 */

/** 要チェック業務のフラグ（3 種 enum 固定・JSONB 配列） */
export type BizFlagsJson = (
  | "重複の可能性"
  | "無駄では？"
  | "目的不明"
)[];

/** ステップ記録の評価軸スコア（JSONB） */
export type AxisScoresJson = {
  achievements: number | null;
  thinkingAbility: number | null;
  communication: number | null;
  cultureFit: number | null;
};

/** 資料リンク（JSONB 配列。Google ドライブ等の URL） */
export type MaterialJson = {
  id: string;
  label: string;
  url: string;
};
