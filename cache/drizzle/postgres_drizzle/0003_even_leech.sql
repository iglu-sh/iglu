CREATE TYPE "public"."access_rule_action" AS ENUM('drop', 'accept');--> statement-breakpoint
ALTER TABLE "access_rules" ALTER COLUMN "start_ip" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "access_rules" ALTER COLUMN "end_ip" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "access_rules" ALTER COLUMN "action" SET DATA TYPE "public"."access_rule_action" USING "action"::"public"."access_rule_action";