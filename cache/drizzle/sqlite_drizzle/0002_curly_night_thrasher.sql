DROP INDEX `access_rules_name_unique`;--> statement-breakpoint
ALTER TABLE `derivations_tenants_links` ADD `pin` integer DEFAULT false NOT NULL;