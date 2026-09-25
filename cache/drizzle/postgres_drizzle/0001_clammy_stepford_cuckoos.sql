ALTER TABLE "derivations" DROP CONSTRAINT "derivations_signing_keys_id_signing_keys_id_fk";
--> statement-breakpoint
ALTER TABLE "derivations_tenants_links" ADD COLUMN "signing_keys_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "derivations_tenants_links" ADD COLUMN "csig" text NOT NULL;--> statement-breakpoint
ALTER TABLE "derivations_tenants_links" ADD CONSTRAINT "derivations_tenants_links_signing_keys_id_signing_keys_id_fk" FOREIGN KEY ("signing_keys_id") REFERENCES "public"."signing_keys"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "derivations" DROP COLUMN "signing_keys_id";--> statement-breakpoint
ALTER TABLE "derivations" DROP COLUMN "csig";