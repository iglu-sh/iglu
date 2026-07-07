CREATE TYPE "public"."access_rule_action" AS ENUM('drop', 'accept');--> statement-breakpoint
CREATE TABLE "access_rules" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"tenants_id" uuid,
	"ip_block" text NOT NULL,
	"start_ip" bigint NOT NULL,
	"end_ip" bigint NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"action" "access_rule_action" NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
	"tenants_id" uuid NOT NULL,
	"last_key_used" uuid NOT NULL,
	"last_seen" bigint DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT NOT NULL,
	"version" text NOT NULL,
	"os" text NOT NULL,
	"is_online" boolean NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "agents_tenants_id_name_pk" PRIMARY KEY("tenants_id","name"),
	CONSTRAINT "agents_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "agents_deployments_links" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"deployments_id" uuid NOT NULL,
	"agents_id" uuid NOT NULL,
	"log" text,
	"started_at" bigint DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT NOT NULL,
	"finished_at" bigint DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
	"closure_size" integer,
	"store_path" text NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"hash" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "api_keys_hash_unique" UNIQUE("hash")
);
--> statement-breakpoint
CREATE TABLE "api_keys_tenants_link" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"tenants_id" uuid NOT NULL,
	"api_keys_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deployment_keys" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"tenants_id" uuid NOT NULL,
	"type" text NOT NULL,
	"hash" text NOT NULL,
	"expires_at" bigint DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT NOT NULL,
	"created_at" bigint DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "deployment_keys_hash_unique" UNIQUE("hash")
);
--> statement-breakpoint
CREATE TABLE "deployments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"tenants_id" uuid NOT NULL,
	"key_used" uuid NOT NULL,
	"deployment_index" integer NOT NULL,
	"created_at" bigint DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT NOT NULL,
	"start_time" bigint DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT NOT NULL,
	"end_time" bigint DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT NOT NULL,
	"status" text NOT NULL,
	"deploy_json" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "derivations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"signing_keys_id" uuid NOT NULL,
	"cderiver" text NOT NULL,
	"cfilehash" text NOT NULL,
	"cfilesize" bigint NOT NULL,
	"cnarhash" text NOT NULL,
	"cnarsize" text NOT NULL,
	"creferences" text NOT NULL,
	"csig" text NOT NULL,
	"cstorehash" text NOT NULL,
	"cstoresuffix" text NOT NULL,
	"parts" text NOT NULL,
	"compression" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "derivations_tenants_links" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"tenants_id" uuid NOT NULL,
	"derivations_id" uuid NOT NULL,
	"pin" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"derivations_tenants_links" uuid NOT NULL,
	"direction" text NOT NULL,
	"date" bigint DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signing_keys" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"api_keys_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"github_username" text NOT NULL,
	"is_public" boolean NOT NULL,
	"name" text NOT NULL,
	"uri" text NOT NULL,
	"priority" integer NOT NULL,
	"permission" text NOT NULL,
	"preferred_compression_method" text NOT NULL,
	"ttl" bigint DEFAULT 86400 NOT NULL,
	CONSTRAINT "tenants_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"tenants_id" uuid NOT NULL,
	"signed_by" uuid NOT NULL,
	"md5" text NOT NULL,
	"compression" text NOT NULL,
	"timeout" bigint DEFAULT EXTRACT(EPOCH FROM NOW() + INTERVAL '900 seconds')::BIGINT NOT NULL,
	"s3_id" text
);
--> statement-breakpoint
ALTER TABLE "access_rules" ADD CONSTRAINT "access_rules_tenants_id_tenants_id_fk" FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_tenants_id_tenants_id_fk" FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_last_key_used_deployment_keys_id_fk" FOREIGN KEY ("last_key_used") REFERENCES "public"."deployment_keys"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agents_deployments_links" ADD CONSTRAINT "agents_deployments_links_deployments_id_deployments_id_fk" FOREIGN KEY ("deployments_id") REFERENCES "public"."deployments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agents_deployments_links" ADD CONSTRAINT "agents_deployments_links_agents_id_agents_id_fk" FOREIGN KEY ("agents_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "api_keys_tenants_link" ADD CONSTRAINT "api_keys_tenants_link_tenants_id_tenants_id_fk" FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "api_keys_tenants_link" ADD CONSTRAINT "api_keys_tenants_link_api_keys_id_api_keys_id_fk" FOREIGN KEY ("api_keys_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deployment_keys" ADD CONSTRAINT "deployment_keys_tenants_id_tenants_id_fk" FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_tenants_id_tenants_id_fk" FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_key_used_deployment_keys_id_fk" FOREIGN KEY ("key_used") REFERENCES "public"."deployment_keys"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "derivations" ADD CONSTRAINT "derivations_signing_keys_id_signing_keys_id_fk" FOREIGN KEY ("signing_keys_id") REFERENCES "public"."signing_keys"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "derivations_tenants_links" ADD CONSTRAINT "derivations_tenants_links_tenants_id_tenants_id_fk" FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "derivations_tenants_links" ADD CONSTRAINT "derivations_tenants_links_derivations_id_derivations_id_fk" FOREIGN KEY ("derivations_id") REFERENCES "public"."derivations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_derivations_tenants_links_derivations_tenants_links_id_fk" FOREIGN KEY ("derivations_tenants_links") REFERENCES "public"."derivations_tenants_links"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "signing_keys" ADD CONSTRAINT "signing_keys_api_keys_id_api_keys_id_fk" FOREIGN KEY ("api_keys_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_tenants_id_tenants_id_fk" FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_signed_by_api_keys_id_fk" FOREIGN KEY ("signed_by") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE cascade;