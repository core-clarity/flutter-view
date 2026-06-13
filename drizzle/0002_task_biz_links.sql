-- BPRタスク ↔ 要チェック業務の n:m（複数本部にまたがるタスク用）
CREATE TABLE IF NOT EXISTS "task_biz_links" (
	"workspace_id" text NOT NULL,
	"task_id" text NOT NULL,
	"biz_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_biz_links_workspace_id_task_id_biz_id_pk" PRIMARY KEY("workspace_id","task_id","biz_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_biz_links" ADD CONSTRAINT "task_biz_links_workspace_id_workspaces_id_fk"
   FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_biz_links" ADD CONSTRAINT "task_biz_links_workspace_id_task_id_bpr_tasks_workspace_id_id_fk"
   FOREIGN KEY ("workspace_id","task_id") REFERENCES "public"."bpr_tasks"("workspace_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_biz_links" ADD CONSTRAINT "task_biz_links_workspace_id_biz_id_biz_items_workspace_id_id_fk"
   FOREIGN KEY ("workspace_id","biz_id") REFERENCES "public"."biz_items"("workspace_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
