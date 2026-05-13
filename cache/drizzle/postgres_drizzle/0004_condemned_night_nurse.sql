ALTER TABLE "access_rules" ALTER COLUMN "id" SET DEFAULT 'uuidv7()';--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "id" SET DEFAULT 'uuidv7()';--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "id" SET DEFAULT 'uuidv7()';--> statement-breakpoint
ALTER TABLE "api_keys_tenants_link" ALTER COLUMN "id" SET DEFAULT 'uuidv7()';--> statement-breakpoint
ALTER TABLE "deployments" ALTER COLUMN "id" SET DEFAULT 'uuidv7()';--> statement-breakpoint
ALTER TABLE "derivations" ALTER COLUMN "id" SET DEFAULT 'uuidv7()';--> statement-breakpoint
ALTER TABLE "derivations_tenants_links" ALTER COLUMN "id" SET DEFAULT 'uuidv7()';--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "id" SET DEFAULT 'uuidv7()';--> statement-breakpoint
ALTER TABLE "signing_keys" ALTER COLUMN "id" SET DEFAULT 'uuidv7()';--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "id" SET DEFAULT 'uuidv7()';--> statement-breakpoint
ALTER TABLE "uploads" ALTER COLUMN "id" SET DEFAULT 'uuidv7()';