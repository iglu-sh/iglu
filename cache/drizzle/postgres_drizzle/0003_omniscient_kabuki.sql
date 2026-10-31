CREATE TYPE "public"."managed_by_enum" AS ENUM('configuration', 'other', 'server');--> statement-breakpoint
CREATE TABLE "database_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"state" json NOT NULL,
	"meta" json NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_rules" ADD COLUMN "managed_by" "managed_by_enum" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "managed_by" "managed_by_enum" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "deployment_keys" ADD COLUMN "managed_by" "managed_by_enum" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "keypairs" ADD COLUMN "managed_by" "managed_by_enum" DEFAULT 'server' NOT NULL;--> statement-breakpoint
ALTER TABLE "signing_keys" ADD COLUMN "managed_by" "managed_by_enum" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "managed_by" "managed_by_enum" DEFAULT 'other' NOT NULL;