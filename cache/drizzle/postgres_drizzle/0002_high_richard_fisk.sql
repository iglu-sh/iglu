ALTER TABLE "agents_deployments_links" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "agents_deployments_links" ALTER COLUMN "deployments_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "agents_deployments_links" ALTER COLUMN "agents_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "deployment_keys" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "deployment_keys" ALTER COLUMN "tenants_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "derivations" ALTER COLUMN "signing_keys_id" SET DATA TYPE uuid;