/**
 * 手動 SQL マイグレーション実行。
 * drizzle-kit push が composite PK の FK 依存で失敗する場合に使用する。
 *
 * 使い方: npm run db:migrate
 */

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const STEPS = [
  `CREATE TABLE IF NOT EXISTS "bpr_stages" (
	"id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bpr_stages_id_workspace_id_pk" PRIMARY KEY("id","workspace_id"),
	CONSTRAINT "bpr_stages_workspace_name" UNIQUE("workspace_id","name")
)`,
  `DO $$ BEGIN
 ALTER TABLE "bpr_stages" ADD CONSTRAINT "bpr_stages_workspace_id_workspaces_id_fk"
   FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$`,
  `INSERT INTO "bpr_stages" ("id", "workspace_id", "name", "sort_order")
SELECT v.stage_id, w.id, v.stage_name, v.sort_order
FROM "workspaces" w
CROSS JOIN (
  VALUES
    ('hearing', 'ヒアリング', 0),
    ('flow', '業務フロー作成', 1),
    ('issues', '課題抽出', 2),
    ('meeting', '要合意MTG', 3),
    ('tobe', 'To-Be策定', 4),
    ('poc', 'PoC', 5)
) AS v(stage_id, stage_name, sort_order)
ON CONFLICT ("id", "workspace_id") DO NOTHING`,
  `ALTER TABLE "bpr_tasks" ADD COLUMN IF NOT EXISTS "stage_id" text`,
  `DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bpr_tasks' AND column_name = 'stage_key'
  ) THEN
    UPDATE "bpr_tasks"
    SET "stage_id" = "stage_key"
    WHERE "stage_id" IS NULL AND "stage_key" IS NOT NULL;
  END IF;
END $$`,
  `UPDATE "bpr_tasks"
SET "stage_id" = 'hearing'
WHERE "stage_id" IS NULL`,
  `ALTER TABLE "bpr_tasks" ALTER COLUMN "stage_id" SET NOT NULL`,
  `DO $$ BEGIN
 ALTER TABLE "bpr_tasks" ADD CONSTRAINT "bpr_tasks_workspace_id_stage_id_bpr_stages_workspace_id_id_fk"
   FOREIGN KEY ("workspace_id","stage_id") REFERENCES "public"."bpr_stages"("workspace_id","id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$`,
  `ALTER TABLE "bpr_tasks" DROP COLUMN IF EXISTS "stage_key"`,
  `ALTER TABLE "task_steps" ADD COLUMN IF NOT EXISTS "materials" jsonb DEFAULT '[]'::jsonb`,
  `DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'task_steps' AND column_name = 'attachments'
  ) THEN
    UPDATE "task_steps"
    SET "materials" = COALESCE("attachments", '[]'::jsonb)
    WHERE "materials" IS NULL
       OR ("attachments" IS NOT NULL AND "materials" = '[]'::jsonb);
  END IF;
END $$`,
  `ALTER TABLE "task_steps" ALTER COLUMN "materials" SET DEFAULT '[]'::jsonb`,
  `ALTER TABLE "task_steps" ALTER COLUMN "materials" SET NOT NULL`,
  `ALTER TABLE "task_steps" DROP COLUMN IF EXISTS "attachments"`,
  `ALTER TABLE "task_steps" DROP COLUMN IF EXISTS "stage_key"`,
  `CREATE TABLE IF NOT EXISTS "task_biz_links" (
	"workspace_id" text NOT NULL,
	"task_id" text NOT NULL,
	"biz_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_biz_links_workspace_id_task_id_biz_id_pk" PRIMARY KEY("workspace_id","task_id","biz_id")
)`,
  `DO $$ BEGIN
 ALTER TABLE "task_biz_links" ADD CONSTRAINT "task_biz_links_workspace_id_workspaces_id_fk"
   FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$`,
  `DO $$ BEGIN
 ALTER TABLE "task_biz_links" ADD CONSTRAINT "task_biz_links_workspace_id_task_id_bpr_tasks_workspace_id_id_fk"
   FOREIGN KEY ("workspace_id","task_id") REFERENCES "public"."bpr_tasks"("workspace_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$`,
  `DO $$ BEGIN
 ALTER TABLE "task_biz_links" ADD CONSTRAINT "task_biz_links_workspace_id_biz_id_biz_items_workspace_id_id_fk"
   FOREIGN KEY ("workspace_id","biz_id") REFERENCES "public"."biz_items"("workspace_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$`,
] as const;

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL が設定されていません");
  }

  const query = neon(url);

  console.log("📦 Running migrations (0001 + 0002)");

  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    console.log(`  [${i + 1}/${STEPS.length}]`);
    await query.query(step);
  }

  console.log("✅ Migration complete");
}

migrate().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
