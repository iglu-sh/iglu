CREATE TYPE "public"."available_signing_methods" AS ENUM('client', 'server');--> statement-breakpoint
CREATE TABLE "keypairs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"private_key" text NOT NULL,
	"signing_keys_id" uuid NOT NULL,
	"tenants_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "signing_method" "available_signing_methods" DEFAULT 'client' NOT NULL;--> statement-breakpoint
ALTER TABLE "keypairs" ADD CONSTRAINT "keypairs_signing_keys_id_signing_keys_id_fk" FOREIGN KEY ("signing_keys_id") REFERENCES "public"."signing_keys"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "keypairs" ADD CONSTRAINT "keypairs_tenants_id_tenants_id_fk" FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;