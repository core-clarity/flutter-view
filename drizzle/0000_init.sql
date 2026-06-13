CREATE TYPE "public"."context_note_ref_type" AS ENUM('task', 'system');--> statement-breakpoint
CREATE TYPE "public"."context_note_type" AS ENUM('法令リスク', '内部統制', '業界慣行', 'ブラックリスト');--> statement-breakpoint
CREATE TYPE "public"."policy_priority" AS ENUM('critical', 'high');--> statement-breakpoint
CREATE TYPE "public"."step_status" AS ENUM('pending', 'planned', 'done');--> statement-breakpoint
CREATE TABLE "biz_items" (
	"id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"dept_id" text NOT NULL,
	"name" text NOT NULL,
	"task_count" integer DEFAULT 0 NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "biz_items_id_workspace_id_pk" PRIMARY KEY("id","workspace_id"),
	CONSTRAINT "biz_items_workspace_dept_name" UNIQUE("workspace_id","dept_id","name")
);
--> statement-breakpoint
CREATE TABLE "biz_sys_links" (
	"workspace_id" text NOT NULL,
	"biz_id" text NOT NULL,
	"sys_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "biz_sys_links_workspace_id_biz_id_sys_id_pk" PRIMARY KEY("workspace_id","biz_id","sys_id")
);
--> statement-breakpoint
CREATE TABLE "bpr_tasks" (
	"id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"biz_id" text NOT NULL,
	"task_name" text NOT NULL,
	"background" text DEFAULT '' NOT NULL,
	"hearing_log" text DEFAULT '' NOT NULL,
	"target_date" text DEFAULT '' NOT NULL,
	"dept_name" text DEFAULT '' NOT NULL,
	"owner" text DEFAULT '' NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"stage_key" text DEFAULT 'hearing' NOT NULL,
	"current_step_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bpr_tasks_id_workspace_id_pk" PRIMARY KEY("id","workspace_id"),
	CONSTRAINT "bpr_tasks_workspace_biz_name" UNIQUE("workspace_id","biz_id","task_name")
);
--> statement-breakpoint
CREATE TABLE "context_notes" (
	"id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"ref_type" "context_note_ref_type" NOT NULL,
	"ref_id" text NOT NULL,
	"note_type" "context_note_type" NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "context_notes_id_workspace_id_pk" PRIMARY KEY("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_id_workspace_id_pk" PRIMARY KEY("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "management_policies" (
	"id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"priority" "policy_priority" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "management_policies_id_workspace_id_pk" PRIMARY KEY("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "policy_system_links" (
	"workspace_id" text NOT NULL,
	"policy_id" text NOT NULL,
	"system_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "policy_system_links_workspace_id_policy_id_system_id_pk" PRIMARY KEY("workspace_id","policy_id","system_id")
);
--> statement-breakpoint
CREATE TABLE "policy_task_links" (
	"workspace_id" text NOT NULL,
	"policy_id" text NOT NULL,
	"task_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "policy_task_links_workspace_id_policy_id_task_id_pk" PRIMARY KEY("workspace_id","policy_id","task_id")
);
--> statement-breakpoint
CREATE TABLE "systems" (
	"id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"system_number" text,
	"name" text NOT NULL,
	"arch_type" text DEFAULT '' NOT NULL,
	"main_db" text DEFAULT '' NOT NULL,
	"vendor" text DEFAULT '' NOT NULL,
	"contract_status" text DEFAULT '' NOT NULL,
	"dept_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "systems_id_workspace_id_pk" PRIMARY KEY("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "task_steps" (
	"id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"task_id" text NOT NULL,
	"sort_order" integer NOT NULL,
	"name" text NOT NULL,
	"stage_key" text,
	"status" "step_status" DEFAULT 'pending' NOT NULL,
	"date" text DEFAULT '' NOT NULL,
	"format" text DEFAULT '' NOT NULL,
	"interviewer" text DEFAULT '' NOT NULL,
	"decision" text DEFAULT '' NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"axis_scores" jsonb DEFAULT '{"achievements":null,"thinkingAbility":null,"communication":null,"cultureFit":null}'::jsonb NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_steps_id_workspace_id_pk" PRIMARY KEY("id","workspace_id"),
	CONSTRAINT "task_steps_workspace_task_order" UNIQUE("workspace_id","task_id","sort_order")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'briefcase' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "biz_items" ADD CONSTRAINT "biz_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biz_items" ADD CONSTRAINT "biz_items_workspace_id_dept_id_departments_workspace_id_id_fk" FOREIGN KEY ("workspace_id","dept_id") REFERENCES "public"."departments"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biz_sys_links" ADD CONSTRAINT "biz_sys_links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biz_sys_links" ADD CONSTRAINT "biz_sys_links_workspace_id_biz_id_biz_items_workspace_id_id_fk" FOREIGN KEY ("workspace_id","biz_id") REFERENCES "public"."biz_items"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biz_sys_links" ADD CONSTRAINT "biz_sys_links_workspace_id_sys_id_systems_workspace_id_id_fk" FOREIGN KEY ("workspace_id","sys_id") REFERENCES "public"."systems"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bpr_tasks" ADD CONSTRAINT "bpr_tasks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bpr_tasks" ADD CONSTRAINT "bpr_tasks_workspace_id_biz_id_biz_items_workspace_id_id_fk" FOREIGN KEY ("workspace_id","biz_id") REFERENCES "public"."biz_items"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_notes" ADD CONSTRAINT "context_notes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_policies" ADD CONSTRAINT "management_policies_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_system_links" ADD CONSTRAINT "policy_system_links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_system_links" ADD CONSTRAINT "policy_system_links_workspace_id_policy_id_management_policies_workspace_id_id_fk" FOREIGN KEY ("workspace_id","policy_id") REFERENCES "public"."management_policies"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_system_links" ADD CONSTRAINT "policy_system_links_workspace_id_system_id_systems_workspace_id_id_fk" FOREIGN KEY ("workspace_id","system_id") REFERENCES "public"."systems"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_task_links" ADD CONSTRAINT "policy_task_links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_task_links" ADD CONSTRAINT "policy_task_links_workspace_id_policy_id_management_policies_workspace_id_id_fk" FOREIGN KEY ("workspace_id","policy_id") REFERENCES "public"."management_policies"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_task_links" ADD CONSTRAINT "policy_task_links_workspace_id_task_id_bpr_tasks_workspace_id_id_fk" FOREIGN KEY ("workspace_id","task_id") REFERENCES "public"."bpr_tasks"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "systems" ADD CONSTRAINT "systems_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_steps" ADD CONSTRAINT "task_steps_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_steps" ADD CONSTRAINT "task_steps_workspace_id_task_id_bpr_tasks_workspace_id_id_fk" FOREIGN KEY ("workspace_id","task_id") REFERENCES "public"."bpr_tasks"("workspace_id","id") ON DELETE no action ON UPDATE no action;