ALTER TABLE "agents" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "last_seen" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "last_seen" SET DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT;--> statement-breakpoint
ALTER TABLE "agents_deployments_links" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "agents_deployments_links" ALTER COLUMN "started_at" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "agents_deployments_links" ALTER COLUMN "started_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT;--> statement-breakpoint
ALTER TABLE "agents_deployments_links" ALTER COLUMN "finished_at" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "agents_deployments_links" ALTER COLUMN "finished_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT;--> statement-breakpoint
ALTER TABLE "deployment_keys" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "deployment_keys" ALTER COLUMN "expires_at" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "deployment_keys" ALTER COLUMN "expires_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT;--> statement-breakpoint
ALTER TABLE "deployment_keys" ALTER COLUMN "created_at" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "deployment_keys" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT;--> statement-breakpoint
ALTER TABLE "deployments" ALTER COLUMN "created_at" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "deployments" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT;--> statement-breakpoint
ALTER TABLE "deployments" ALTER COLUMN "start_time" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "deployments" ALTER COLUMN "start_time" SET DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT;--> statement-breakpoint
ALTER TABLE "deployments" ALTER COLUMN "end_time" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "deployments" ALTER COLUMN "end_time" SET DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT;--> statement-breakpoint
ALTER TABLE "derivations" ALTER COLUMN "parts" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "date" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "date" SET DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "ttl" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "ttl" SET DEFAULT 86400;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "permission" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "preferred_compression_method" text NOT NULL;